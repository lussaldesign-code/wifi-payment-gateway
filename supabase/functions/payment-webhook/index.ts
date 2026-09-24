import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const hex=(buf:ArrayBuffer)=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
async function hmac(key:string,data:string){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(data)))}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({success:false,message:"Method not allowed"},405);
 try{
  const raw=await req.text(),received=req.headers.get("X-Callback-Signature")||"",privateKey=Deno.env.get("TRIPAY_PRIVATE_KEY")||"";
  if(!privateKey)return json({success:false,message:"Webhook secret belum dikonfigurasi"},503);
  const expected=await hmac(privateKey,raw); if(received.length!==expected.length)return json({success:false,message:"Invalid signature"},403);
  let diff=0;for(let i=0;i<expected.length;i++)diff|=received.charCodeAt(i)^expected.charCodeAt(i);if(diff!==0)return json({success:false,message:"Invalid signature"},403);
  const payload=JSON.parse(raw);const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;const supabase=createClient(Deno.env.get("SUPABASE_URL")!,secret);
  const {data:tx}=await supabase.from("transactions").select("id,merchant_ref,plan_id,amount,status").eq("merchant_ref",payload.merchant_ref).single();
  if(!tx)return json({success:false,message:"Transaction not found"},404);
  await supabase.from("webhook_logs").insert({provider:"tripay",event_type:payload.status||payload.event||"callback",event_id:payload.reference||payload.merchant_ref,signature_valid:true,payload,processed:false});
  if(payload.amount&&Number(payload.amount)!==Number(tx.amount))throw new Error("Nominal pembayaran tidak cocok");
  if(payload.status!=="PAID"){await supabase.from("transactions").update({status:payload.status||"PENDING",provider_reference:payload.reference||null}).eq("id",tx.id);return json({success:true})}
  if(tx.status==="PAID")return json({success:true,duplicate:true});
  const {data:plan}=await supabase.from("plans").select("duration_minutes,hotspot_profile").eq("id",tx.plan_id).single();
  const expires=new Date(Date.now()+Number(plan.duration_minutes)*60000).toISOString(),username="wifi"+crypto.randomUUID().replaceAll("-","").slice(0,10),password=crypto.randomUUID().replaceAll("-","").slice(0,10);
  await supabase.from("transactions").update({status:"PAID",provider_reference:payload.reference||null,paid_at:new Date().toISOString()}).eq("id",tx.id);
  const {data:account,error:accountError}=await supabase.from("wifi_accounts").insert({transaction_id:tx.id,username,password,hotspot_profile:plan.hotspot_profile,expires_at:expires,status:"PENDING"}).select("id").single();
  if(accountError&&accountError.code!=="23505")throw accountError;if(!account)return json({success:true,duplicate:true});
  const {error:jobError}=await supabase.from("activation_jobs").insert({wifi_account_id:account.id,status:"PENDING",attempts:0});if(jobError)throw jobError;
  return json({success:true,activation:"queued"});
 }catch(e){return json({success:false,message:e instanceof Error?e.message:"Webhook error"},500)}
});
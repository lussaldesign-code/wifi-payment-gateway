import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const ref=new URL(req.url).searchParams.get("ref");if(!ref)return json({success:false,message:"ref wajib"},400);
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;const supabase=createClient(Deno.env.get("SUPABASE_URL")!,secret);
 const {data:tx,error}=await supabase.from("transactions").select("id,merchant_ref,amount,payment_method,status,paid_at,created_at").eq("merchant_ref",ref).single();
 if(error||!tx)return json({success:false,message:"Transaksi tidak ditemukan"},404);
 const out:any={merchant_ref:tx.merchant_ref,amount:tx.amount,payment_method:tx.payment_method,status:tx.status,paid_at:tx.paid_at,created_at:tx.created_at};
 if(tx.status==="PAID"){const {data:a}=await supabase.from("wifi_accounts").select("username,password,expires_at,status").eq("transaction_id",tx.id).single();if(a)out.wifi=a}
 return json({success:true,data:out});
});
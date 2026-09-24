import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({success:false,message:"Method not allowed"},405);
 try{
  const body=await req.json(); const {planId,customerName,customerPhone,customerEmail=""}=body;
  if(!planId)return json({success:false,message:"planId wajib diisi"},400);
  const url=Deno.env.get("SUPABASE_URL")!;
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;
  const supabase=createClient(url,secret);
  const {data:plan,error:planError}=await supabase.from("plans").select("id,name,price,duration_minutes,hotspot_profile").eq("id",planId).eq("is_active",true).single();
  if(planError||!plan)return json({success:false,message:"Paket tidak ditemukan"},404);
  const merchantRef="WIFI-"+Date.now()+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const {data:customer,error:customerError}=await supabase.from("customers").insert({name:customerName||"Pelanggan",phone:customerPhone||null,email:customerEmail||null}).select("id").single();
  if(customerError)throw customerError;
  const {error:txError}=await supabase.from("transactions").insert({merchant_ref:merchantRef,customer_id:customer.id,plan_id:plan.id,amount:plan.price,payment_method:Deno.env.get("TRIPAY_CHANNEL")||"QRIS2",payment_provider:"tripay",status:"PENDING"});
  if(txError)throw txError;
  const apiKey=Deno.env.get("TRIPAY_API_KEY"),privateKey=Deno.env.get("TRIPAY_PRIVATE_KEY"),merchantCode=Deno.env.get("TRIPAY_MERCHANT_CODE");
  if(!apiKey||!privateKey||!merchantCode)return json({success:false,message:"Payment gateway belum dikonfigurasi di server"},503);
  const base=(Deno.env.get("TRIPAY_MODE")||"sandbox")==="production"?"https://tripay.co.id/api":"https://tripay.co.id/api-sandbox";
  const baseUrl=Deno.env.get("PUBLIC_BASE_URL")||url+"/functions/v1";
  const params=new URLSearchParams({method:Deno.env.get("TRIPAY_CHANNEL")||"QRIS2",merchant_ref:merchantRef,amount:String(plan.price),customer_name:customerName||"Pelanggan",customer_email:customerEmail||"customer@example.com",customer_phone:customerPhone||"",order_items:JSON.stringify([{sku:"WIFI-"+plan.id,name:plan.name,price:plan.price,quantity:1}]),callback_url:baseUrl+"/payment-webhook",return_url:(Deno.env.get("PUBLIC_SITE_URL")||"")+"/payment?ref="+encodeURIComponent(merchantRef)});
  const response=await fetch(base+"/merchant/transaction/create",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const result=await response.json(); if(!response.ok||!result.success)throw new Error(result.message||"Tripay gagal membuat transaksi");
  await supabase.from("transactions").update({provider_reference:result.data.reference,payment_method:result.data.payment_method||params.get("method")}).eq("merchant_ref",merchantRef);
  return json({success:true,data:{merchant_ref:merchantRef,reference:result.data.reference,checkout_url:result.data.checkout_url,payment_method:result.data.payment_method,amount:plan.price}});
 }catch(e){return json({success:false,message:e instanceof Error?e.message:"Server error"},500)}
});
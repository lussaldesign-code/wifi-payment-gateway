import crypto from "node:crypto";
const base=process.env.TRIPAY_MODE==="production"?"https://tripay.co.id/api":"https://tripay.co.id/api-sandbox";
export function callbackSignature(raw){return crypto.createHmac("sha256",process.env.TRIPAY_PRIVATE_KEY||"").update(raw).digest("hex");}
export async function createTransaction(x){
 const body=new URLSearchParams({method:x.method,merchant_ref:x.merchantRef,amount:String(x.amount),customer_name:x.customerName||"Pelanggan",customer_email:"customer@example.com",customer_phone:x.customerPhone||"",order_items:JSON.stringify(x.orderItems),callback_url:(process.env.BASE_URL||"")+"/api/webhook/tripay",return_url:(process.env.BASE_URL||"")+"/payment?ref="+encodeURIComponent(x.merchantRef)});
 const r=await fetch(base+"/merchant/transaction/create",{method:"POST",headers:{Authorization:"Bearer "+process.env.TRIPAY_API_KEY,"Content-Type":"application/x-www-form-urlencoded"},body});
 const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||"Tripay error"); return j.data;
}

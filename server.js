import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import crypto from "node:crypto";
import db from "./src/db.js";
import {createTransaction,callbackSignature} from "./src/tripay.js";
import {createHotspotUser} from "./src/mikrotik.js";

const app=express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(morgan("tiny"));
app.use(express.json({verify:(req,_res,buf)=>{req.rawBody=buf.toString("utf8")}}));
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

function admin(req,res,next){
 const token=(req.headers.authorization||"").replace("Bearer ","");
 if(!process.env.ADMIN_TOKEN || token!==process.env.ADMIN_TOKEN) return res.status(401).json({success:false,message:"Unauthorized"});
 next();
}
function ref(){return "WIFI-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();}
function credential(){return crypto.randomBytes(4).toString("hex");}

app.get("/api/health",(req,res)=>res.json({success:true,service:"wifi-payment-gateway"}));
app.get("/api/plans",(req,res)=>res.json({success:true,data:db.prepare("SELECT id,name,price,duration_minutes,hotspot_profile FROM plans WHERE active=1 ORDER BY price").all()}));
app.get("/api/payment/:merchantRef",(req,res)=>{
 const x=db.prepare("SELECT merchant_ref,status,amount,payment_method,checkout_url,username,password,expires_at,router_status,created_at,paid_at FROM transactions WHERE merchant_ref=?").get(req.params.merchantRef);
 if(!x)return res.status(404).json({success:false,message:"Invoice tidak ditemukan"});
 res.json({success:true,data:x});
});

app.post("/api/checkout",async(req,res)=>{
 try{
  const {planId,customerName,customerPhone,method}=req.body;
  const plan=db.prepare("SELECT * FROM plans WHERE id=? AND active=1").get(Number(planId));
  if(!plan)return res.status(400).json({success:false,message:"Paket tidak ditemukan"});
  const merchantRef=ref();
  db.prepare("INSERT INTO transactions(merchant_ref,plan_id,customer_name,customer_phone,amount,payment_method) VALUES(?,?,?,?,?,?)").run(merchantRef,plan.id,customerName||"Pelanggan",customerPhone||"",plan.price,method||process.env.TRIPAY_CHANNEL||"QRIS");
  if(!process.env.TRIPAY_API_KEY)return res.json({success:true,demo:true,data:{merchant_ref:merchantRef,status:"UNPAID"}});
  const p=await createTransaction({merchantRef,amount:plan.price,method:method||process.env.TRIPAY_CHANNEL||"QRIS",customerName,customerPhone,orderItems:[{sku:"WIFI-"+plan.id,name:plan.name,price:plan.price,quantity:1}]});
  db.prepare("UPDATE transactions SET reference=?,checkout_url=?,payment_method=? WHERE merchant_ref=?").run(p.reference,p.checkout_url,p.payment_method,merchantRef);
  res.json({success:true,data:{merchant_ref:merchantRef,reference:p.reference,checkout_url:p.checkout_url,payment_method:p.payment_method}});
 }catch(e){res.status(500).json({success:false,message:e.message});}
});

app.post("/api/webhook/tripay",async(req,res)=>{
 try{
  const raw=req.rawBody||JSON.stringify(req.body);
  const received=req.headers["x-callback-signature"]||"";
  if(process.env.TRIPAY_PRIVATE_KEY){
   const expected=callbackSignature(raw);
   if(received.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(received),Buffer.from(expected))) return res.status(403).json({success:false,message:"Invalid signature"});
  }
  const {event,reference,merchant_ref,status}=req.body;
  db.prepare("INSERT INTO webhook_events(reference,event,payload) VALUES(?,?,?)").run(reference||"",event||"",raw);
  const tx=db.prepare("SELECT * FROM transactions WHERE merchant_ref=?").get(merchant_ref);
  if(!tx)return res.status(404).json({success:false,message:"Transaction not found"});
  if(status!=="PAID"){
   db.prepare("UPDATE transactions SET status=?,reference=COALESCE(reference,?),raw_callback=? WHERE merchant_ref=?").run(status||"UNKNOWN",reference||null,raw,merchant_ref);
   return res.json({success:true});
  }
  if(tx.status==="PAID")return res.json({success:true,duplicate:true});
  const plan=db.prepare("SELECT * FROM plans WHERE id=?").get(tx.plan_id);
  const username="wifi"+Date.now().toString().slice(-7);
  const password=credential();
  const expires=new Date(Date.now()+plan.duration_minutes*60000);
  let routerStatus="PENDING";
  try{await createHotspotUser({username,password,profile:plan.hotspot_profile});routerStatus=process.env.MIKROTIK_ENABLED==="true"?"ACTIVE":"SKIPPED";}catch(e){routerStatus="ERROR: "+e.message.slice(0,180);}
  db.prepare("UPDATE transactions SET status='PAID',reference=COALESCE(reference,?),paid_at=CURRENT_TIMESTAMP,username=?,password=?,expires_at=?,router_status=?,raw_callback=? WHERE merchant_ref=?").run(reference||null,username,password,expires.toISOString(),routerStatus,raw,merchant_ref);
  res.json({success:true});
 }catch(e){res.status(500).json({success:false,message:e.message});}
});

app.get("/api/admin/transactions",admin,(req,res)=>res.json({success:true,data:db.prepare("SELECT * FROM transactions ORDER BY id DESC LIMIT 200").all()}));
app.post("/api/admin/plans",admin,(req,res)=>{
 const {name,price,duration_minutes,hotspot_profile}=req.body;
 if(!name||!price||!duration_minutes)return res.status(400).json({success:false,message:"Data paket belum lengkap"});
 const r=db.prepare("INSERT INTO plans(name,price,duration_minutes,hotspot_profile) VALUES(?,?,?,?)").run(name,Number(price),Number(duration_minutes),hotspot_profile||"default");
 res.json({success:true,id:r.lastInsertRowid});
});

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log("WiFi Payment Gateway running on port "+port));

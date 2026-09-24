import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const auth=(req:Request)=>!!Deno.env.get("AGENT_TOKEN")&&req.headers.get("X-Agent-Token")===Deno.env.get("AGENT_TOKEN");
Deno.serve(async(req)=>{
 if(!auth(req))return json({success:false,message:"Unauthorized"},401);
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;const supabase=createClient(Deno.env.get("SUPABASE_URL")!,secret);
 if(req.method==="GET"){const {data,error}=await supabase.from("activation_jobs").select("id,attempts,wifi_account_id,wifi_accounts(username,password,hotspot_profile,expires_at,status)").eq("status","PENDING").order("created_at").limit(5);if(error)return json({success:false,message:error.message},500);for(const j of data||[])await supabase.from("activation_jobs").update({status:"PROCESSING",locked_at:new Date().toISOString(),attempts:(j.attempts||0)+1}).eq("id",j.id).eq("status","PENDING");return json({success:true,jobs:data||[]})}
 if(req.method==="POST"){const b=await req.json(),jobId=b.jobId,ok=!!b.success;if(!jobId)return json({success:false,message:"jobId wajib"},400);const {data:j}=await supabase.from("activation_jobs").select("wifi_account_id").eq("id",jobId).single();if(!j)return json({success:false,message:"Job tidak ditemukan"},404);await supabase.from("activation_jobs").update({status:ok?"SUCCESS":"FAILED",last_error:ok?null:(b.error||"Activation failed"),completed_at:ok?new Date().toISOString():null}).eq("id",jobId);await supabase.from("wifi_accounts").update({status:ok?"ACTIVE":"ERROR",activated_at:ok?new Date().toISOString():null}).eq("id",j.wifi_account_id);return json({success:true})}
 return json({success:false,message:"Method not allowed"},405);
});
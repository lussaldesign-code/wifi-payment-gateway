import "dotenv/config";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const base=(process.env.SUPABASE_FUNCTION_URL||"").replace(/\/$/,"");
const headers={"X-Agent-Token":process.env.AGENT_TOKEN||"","Content-Type":"application/json"};
async function router(path,options={}){
 const auth=Buffer.from((process.env.MIKROTIK_USERNAME||"")+":"+(process.env.MIKROTIK_PASSWORD||"")).toString("base64");
 const r=await fetch((process.env.MIKROTIK_URL||"").replace(/\/$/,"")+path,{...options,headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"}});
 if(!r.ok)throw new Error("MikroTik HTTP "+r.status+" "+await r.text());
 return r.json().catch(()=>({}));
}
async function run(){
 if(!base||!process.env.AGENT_TOKEN||!process.env.MIKROTIK_URL)throw new Error("Konfigurasi agent belum lengkap");
 console.log("WiFi MikroTik Agent aktif");
 while(true){
  try{
   const r=await fetch(base,{headers}); const j=await r.json();
   if(!r.ok)throw new Error(j.message||"Polling gagal");
   for(const job of j.jobs||[]){
    try{
     const a=job.wifi_accounts;
     await router("/rest/ip/hotspot/user",{method:"PUT",body:JSON.stringify({name:a.username,password:a.password,profile:a.hotspot_profile,comment:"WiFi Gateway "+job.id})});
     const now=Date.now();
     if(a.expires_at){const remain=Math.max(0,new Date(a.expires_at).getTime()-now);if(remain===0)throw new Error("Akun sudah kedaluwarsa")}
     await fetch(base,{method:"POST",headers,body:JSON.stringify({jobId:job.id,success:true})});
     console.log("AKTIF:",a.username);
    }catch(e){
     await fetch(base,{method:"POST",headers,body:JSON.stringify({jobId:job.id,success:false,error:e.message})});
     console.error("GAGAL:",job.id,e.message);
    }
   }
  }catch(e){console.error("Agent:",e.message)}
  await sleep(Number(process.env.POLL_SECONDS||5)*1000);
 }
}
run().catch(e=>{console.error(e);process.exit(1)});
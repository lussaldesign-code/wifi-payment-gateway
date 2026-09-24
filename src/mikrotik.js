export async function createHotspotUser({username,password,profile}){
 if(process.env.MIKROTIK_ENABLED!=="true") return {skipped:true};
 const base=(process.env.MIKROTIK_URL||"").replace(/\/$/,"")+"/rest/ip/hotspot/user";
 const auth=Buffer.from((process.env.MIKROTIK_USERNAME||"")+":"+(process.env.MIKROTIK_PASSWORD||"")).toString("base64");
 const r=await fetch(base,{method:"PUT",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({name:username,password,profile:profile||"default"})});
 const t=await r.text(); if(!r.ok) throw new Error("MikroTik: "+t); return {skipped:false};
}

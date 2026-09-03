const BASE = process.env.EVOLUTION_API_URL ?? "http://evolution:8080";
const KEY = process.env.EVOLUTION_API_KEY ?? "";

function headers(){ return { "Content-Type":"application/json", "apikey": KEY } as Record<string,string>; }

export async function evolutionCreateInstance(instance:string){
  const r=await fetch(`${BASE}/instance/create`,{ method:"POST", headers:headers(), body: JSON.stringify({ instanceName: instance, qrcode:true, integration:"WHATSAPP-BAILEYS" }) });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution create ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionStatus(instance:string){
  const r=await fetch(`${BASE}/instance/connectionState/${instance}`,{ headers:headers() });
  return r.json().catch(()=>({}));
}
export async function evolutionSendText(instance:string, number:string, text:string, opts?:{ presence?:string, delayMs?:number }){
  const r=await fetch(`${BASE}/message/sendText/${instance}`,{
    method:"POST", headers:headers(),
    body: JSON.stringify({ number, text, options:{ delay: opts?.delayMs ?? 1200, presence: opts?.presence ?? "composing" } })
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution send ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionLogout(instance:string){
  const r=await fetch(`${BASE}/instance/logout/${instance}`,{ method:"DELETE", headers:headers() });
  return r.json().catch(()=>({}));
}

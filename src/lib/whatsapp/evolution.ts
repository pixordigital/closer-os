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
export async function evolutionDelete(instance:string){
  const r=await fetch(`${BASE}/instance/delete/${instance}`,{ method:"DELETE", headers:headers() });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution delete ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionRestart(instance:string){
  const r=await fetch(`${BASE}/instance/restart/${instance}`,{ method:"PUT", headers:headers() });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution restart ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionSetWebhook(instance:string, url:string, events?:string[]){
  const r=await fetch(`${BASE}/webhook/set/${instance}`,{ method:"POST", headers:headers(), body: JSON.stringify({ url, webhookByEvents: !!events, webhookBase64:false, events }) });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution webhook ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionUpdateSettings(instance:string, settings:Record<string,unknown>){
  const r=await fetch(`${BASE}/settings/set/${instance}`,{ method:"POST", headers:headers(), body: JSON.stringify(settings) });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Evolution settings ${r.status}: ${JSON.stringify(j).slice(0,400)}`);
  return j;
}
export async function evolutionFetchInstances(){
  const r=await fetch(`${BASE}/instance/fetchInstances`,{ headers:headers() });
  const j=await r.json().catch(()=>[]);
  if(!r.ok) throw new Error(`Evolution fetch ${r.status}`);
  return j;
}

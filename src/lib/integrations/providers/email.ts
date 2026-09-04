import type { IntegrationProvider } from "../types";

// ponytail: mock logs to console in dev, real Gmail via API token when GMAIL_TOKEN set
export class MockEmailProvider implements IntegrationProvider {
  readonly name = "mock-email";
  readonly kind = "email" as const;
  async verify() { return { ok: true, message: "mock-email connected (log only)" }; }
  async sendEmail(_c: Record<string, unknown>, input:{to:string;subject:string;html:string;dealId?:string}){
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    console.log(`[email mock] to=${input.to} subject=${input.subject} deal=${input.dealId ?? "-"} id=${id}`);
    return { messageId: id };
  }
  async listInbox(){
    return [{ id:"mock-1", from:"cliente@acme.co", subject:"Re: proposta", snippet:"Conseguiu validar internamente?", date: new Date().toISOString() }];
  }
}

export class GmailStub implements IntegrationProvider {
  readonly name = "gmail";
  readonly kind = "email" as const;
  async verify(c: Record<string, unknown>){
    const tok = String(c.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if(!tok) return { ok:false, message:"GMAIL_TOKEN / accessToken not configured" };
    try{
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers:{Authorization:`Bearer ${tok}`}, signal:AbortSignal.timeout(5000)});
      if(r.status===401) return { ok:false, message:"invalid token (401)" };
      return { ok:r.ok, message: r.ok ? "gmail connected" : `HTTP ${r.status}` };
    }catch(e){ return { ok:false, message:String(e).slice(0,300)}; }
  }
  async sendEmail(c: Record<string,unknown>, input:{to:string;subject:string;html:string}){
    const tok = String(c.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if(!tok) throw new Error("gmail not configured");
    const raw = Buffer.from(`To: ${input.to}\r\nSubject: ${input.subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${input.html}`).toString("base64url");
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method:"POST", headers:{Authorization:`Bearer ${tok}`, "Content-Type":"application/json"}, body: JSON.stringify({raw}), signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error(`Gmail send ${r.status}: ${(await r.text()).slice(0,400)}`);
    const j = await r.json() as {id:string}; return { messageId: j.id };
  }
  async listInbox(c: Record<string,unknown>, opts?:{max?:number}){
    const tok = String(c.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if(!tok) throw new Error("gmail not configured");
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${opts?.max ?? 10}&q=newer_than:30d`, { headers:{Authorization:`Bearer ${tok}`}, signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw new Error(`Gmail list ${r.status}`);
    const j = await r.json() as {messages?:Array<{id:string}>};
    const out: Array<{id:string;from:string;subject:string;snippet:string;date:string}> = [];
    for(const m of (j.messages ?? []).slice(0, opts?.max ?? 10)){
      const d = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers:{Authorization:`Bearer ${tok}`}, signal:AbortSignal.timeout(5000)});
      if(!d.ok) continue;
      const dj = await d.json() as {snippet?:string; payload?:{headers?:Array<{name:string;value:string}>}};
      const h = dj.payload?.headers ?? [];
      const get=(n:string)=>h.find(x=>x.name.toLowerCase()===n.toLowerCase())?.value ?? "";
      out.push({ id:m.id, from:get("From"), subject:get("Subject")||"(sem assunto)", snippet: dj.snippet ?? "", date: get("Date")||new Date().toISOString() });
    }
    return out;
  }
}

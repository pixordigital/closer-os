import type { IntegrationProvider } from "../types";

function getOAuthConfig(){
  const raw = process.env.GOOGLE_CALENDAR_CREDENTIALS ?? "";
  try { const j=JSON.parse(raw); return { clientId: j.client_id ?? j.clientId, clientSecret: j.client_secret ?? j.clientSecret, redirectUri: j.redirect_uris?.[0] ?? j.redirectUri ?? process.env.APP_URL+"/api/calendar/callback" }; } catch { return null; }
}

export class GoogleCalendarProvider implements IntegrationProvider {
  readonly name = "google-calendar";
  readonly kind = "calendar" as const;
  authUrl(state:string){
    const c=getOAuthConfig(); if(!c?.clientId) throw new Error("Google credentials not configured");
    const u=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", c.clientId);
    u.searchParams.set("redirect_uri", c.redirectUri);
    u.searchParams.set("response_type","code");
    u.searchParams.set("scope","https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events");
    u.searchParams.set("access_type","offline");
    u.searchParams.set("prompt","consent");
    u.searchParams.set("state",state);
    return u.toString();
  }
  async verify(config: Record<string, unknown>){
    const token = (config.access_token as string) || (config.credentials as string) || "";
    if(!token) return { ok:false, message:"Sem access_token — conecte no /api/calendar/auth" };
    try{
      const r=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1",{ headers:{ Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(5000) });
      if(r.status===401) return { ok:false, message:"token expirado — reconecte" };
      return { ok:r.ok, message: r.ok?"connected":`HTTP ${r.status}` };
    }catch(e){ return { ok:false, message:String(e).slice(0,300)}}
  }
  async listEvents(config: Record<string, unknown>){
    const v=await this.verify(config); if(!v.ok) throw new Error(v.message);
    const token=String((config.access_token as string) || (config.credentials as string) || "");
    const r=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true",{ headers:{ Authorization:`Bearer ${token}` }});
    if(!r.ok) throw new Error(`Calendar ${r.status}`);
    const j=await r.json() as {items?:Array<{id:string,summary?:string,start?:{dateTime?:string}}>} ;
    return (j.items??[]).map(it=>({ id:it.id, title:it.summary??"(sem título)", start:it.start?.dateTime ?? "" }));
  }
  async createEvent(config: Record<string, unknown>, p:{summary:string, description?:string, start:string, end:string, attendees?:string[]}){
    const token=String((config.access_token as string)||"");
    if(!token) throw new Error("Sem token");
    const r=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",{
      method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        summary:p.summary, description:p.description,
        start:{ dateTime:p.start }, end:{ dateTime:p.end },
        attendees: (p.attendees??[]).map(e=>({email:e})),
        conferenceData:{ createRequest:{ requestId: Math.random().toString(36).slice(2), conferenceSolutionKey:{type:"hangoutsMeet"} } }
      })
    });
    if(!r.ok) throw new Error(`Create event ${r.status}: ${(await r.text()).slice(0,400)}`);
    const j=await r.json() as { id:string, hangoutLink?:string, htmlLink?:string };
    return { id:j.id, hangoutLink: j.hangoutLink, htmlLink: j.htmlLink };
  }
}

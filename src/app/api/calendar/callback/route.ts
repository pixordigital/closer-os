import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as jose from "jose";

export async function GET(req:Request){
  const url=new URL(req.url);
  const code=url.searchParams.get("code");
  const state=url.searchParams.get("state");
  if(!code || !state) return NextResponse.json({ error:"missing code/state" }, { status:400 });
  let payload:{ organizationId:string, userId:string }|null=null;
  try{ const { payload: p } = await jose.jwtVerify(state, new TextEncoder().encode(process.env.AUTH_SECRET!)); payload=p as unknown as { organizationId:string, userId:string }; }catch{ return NextResponse.json({ error:"invalid state" }, { status:400});}
  let cfg:{clientId:string,clientSecret:string,redirectUri:string}|null=null;
  const existingCfg = await prisma.integrationConnection.findFirst({ where:{ organizationId: payload.organizationId, provider:"google-calendar" } });
  const rawDb = (existingCfg?.config as Record<string,unknown>) ?? null;
  if(rawDb?.client_id || rawDb?.clientId){
    const j=rawDb as Record<string,string>;
    cfg={ clientId: j.client_id ?? j.clientId, clientSecret: j.client_secret ?? j.clientSecret, redirectUri: j.redirect_uris?.[0] ?? j.redirectUri ?? j.redirect_uri ?? process.env.APP_URL+"/api/calendar/callback" };
  } else {
    const raw=process.env.GOOGLE_CALENDAR_CREDENTIALS ?? "";
    try{ const j=JSON.parse(raw); cfg={ clientId:j.client_id??j.clientId, clientSecret:j.client_secret??j.clientSecret, redirectUri: j.redirect_uris?.[0] ?? process.env.APP_URL+"/api/calendar/callback" }; }catch{}
  }
  if(!cfg?.clientId) return NextResponse.json({ error:"Google Calendar credentials não configuradas — cole JSON em /integrations → Google 1-clique", hint:"POST /api/integrations {provider:'google-calendar', config:{client_id, client_secret}}" }, { status:500});
  const tokenRes=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type:"authorization_code" })
  });
  if(!tokenRes.ok) return NextResponse.json({ error:`token ${tokenRes.status}: ${await tokenRes.text()}` }, { status:500});
  const tok=await tokenRes.json() as { access_token:string, refresh_token?:string, expiry_date?:number };
  await prisma.integrationConnection.upsert({
    where:{ id: `cal-${payload.organizationId}` } as never,
    create:{ id:`cal-${payload.organizationId}`, organizationId: payload.organizationId, provider:"google-calendar", kind:"calendar", status:"connected", config:{ access_token: tok.access_token, refresh_token: tok.refresh_token, expiry: tok.expiry_date } as never } as never,
    update:{ status:"connected", config:{ access_token: tok.access_token, refresh_token: tok.refresh_token, expiry: tok.expiry_date } as never } as never,
  });
  const redirect=new URL("/integrations", req.url);
  redirect.searchParams.set("calendar","connected");
  return NextResponse.redirect(redirect);
}

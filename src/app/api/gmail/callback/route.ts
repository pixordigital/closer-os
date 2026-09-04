import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as jose from "jose";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.json({ error: "missing code/state" }, { status: 400 });
  let payload: { organizationId: string; userId: string } | null = null;
  try {
    const { payload: p } = await jose.jwtVerify(state, new TextEncoder().encode(process.env.AUTH_SECRET!));
    payload = p as unknown as { organizationId: string; userId: string };
  } catch {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  let cfg: { clientId: string; clientSecret: string; redirectUri: string } | null = null;
  const existingCfg = await prisma.integrationConnection.findFirst({ where:{ organizationId: payload.organizationId, provider:"gmail" } });
  const rawDb = (existingCfg?.config as Record<string,unknown>) ?? null;
  if(rawDb?.client_id || rawDb?.clientId){
    const j=rawDb as Record<string,string>;
    cfg={ clientId: j.client_id ?? j.clientId, clientSecret: j.client_secret ?? j.clientSecret, redirectUri: j.redirect_uris?.[0] ?? j.redirectUri ?? j.redirect_uri ?? `${process.env.APP_URL ?? "http://localhost:3000"}/api/gmail/callback` };
  } else {
    const raw = process.env.GOOGLE_GMAIL_CREDENTIALS ?? process.env.GOOGLE_CALENDAR_CREDENTIALS ?? "";
    try {
      const j = JSON.parse(raw);
      cfg = { clientId: j.client_id ?? j.clientId, clientSecret: j.client_secret ?? j.clientSecret, redirectUri: j.redirect_uris?.[0] ?? `${process.env.APP_URL ?? "http://localhost:3000"}/api/gmail/callback` };
    } catch {}
  }
  if (!cfg?.clientId) return NextResponse.json({ error: "Google Gmail credentials não configuradas — cole JSON em /integrations", hint:"POST /api/integrations {provider:'gmail', config:{client_id, client_secret}}" }, { status: 500 });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: `token ${tokenRes.status}: ${await tokenRes.text()}` }, { status: 500 });
  const tok = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expiry_date?: number; expires_in?: number };
  const expiry = tok.expiry_date ?? (tok.expires_in ? Date.now() + tok.expires_in * 1000 : undefined);
  const config = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry, token_type: "Bearer" };
  const existing = await prisma.integrationConnection.findFirst({ where: { organizationId: payload.organizationId, provider: "gmail", kind: "email" } });
  if (existing) {
    await prisma.integrationConnection.update({ where: { id: existing.id }, data: { status: "connected", config: { ...(existing.config as Record<string, unknown>), ...config, refresh_token: tok.refresh_token ?? (existing.config as Record<string, unknown>)?.refresh_token } as never } as never });
  } else {
    await prisma.integrationConnection.create({ data: { organizationId: payload.organizationId, provider: "gmail", kind: "email", status: "connected", config: config as never } as never });
  }
  const redirect = new URL("/integrations", req.url);
  redirect.searchParams.set("gmail", "connected");
  return NextResponse.redirect(redirect);
}

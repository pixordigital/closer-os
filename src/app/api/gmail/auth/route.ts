import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { GmailProvider } from "@/lib/integrations/providers/gmail";
import * as jose from "jose";

export async function GET() {
  const { organizationId, userId } = await requireTenant();
  const state = await new jose.SignJWT({ organizationId, userId, kind: "gmail" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const { prisma } = await import("@/lib/db");
  const existing = await prisma.integrationConnection.findFirst({ where:{ organizationId, provider:"gmail" } });
  const override = (existing?.config as Record<string,unknown>) ?? undefined;
  try{
    const url = new GmailProvider().authUrl(state, override);
    return NextResponse.redirect(url);
  }catch(e){ return NextResponse.json({ error: String((e as Error).message), hint: "Configure em /integrations → Google 1-clique" }, { status:400 }); }
}

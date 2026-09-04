import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { GoogleCalendarProvider } from "@/lib/integrations/providers/googleCalendar";
import * as jose from "jose";

export async function GET(){
  const { organizationId, userId } = await requireTenant();
  const state = await new jose.SignJWT({ organizationId, userId }).setProtectedHeader({alg:"HS256"}).setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const { prisma } = await import("@/lib/db");
  const existing = await prisma.integrationConnection.findFirst({ where:{ organizationId, provider:"google-calendar" } });
  const override = (existing?.config as Record<string,unknown>) ?? undefined;
  try {
    const url = new GoogleCalendarProvider().authUrl(state, override);
    return NextResponse.redirect(url);
  } catch(e){ return NextResponse.json({ error: String((e as Error).message), hint: "Configure em /integrations → Google 1-clique → cole JSON do Google Cloud" }, { status: 400 }); }
}

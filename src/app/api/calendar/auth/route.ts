import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { GoogleCalendarProvider } from "@/lib/integrations/providers/googleCalendar";
import * as jose from "jose";

export async function GET(){
  const { organizationId, userId } = await requireTenant();
  const state = await new jose.SignJWT({ organizationId, userId }).setProtectedHeader({alg:"HS256"}).setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const url = new GoogleCalendarProvider().authUrl(state);
  return NextResponse.redirect(url);
}

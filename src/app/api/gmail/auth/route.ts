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
  const url = new GmailProvider().authUrl(state);
  return NextResponse.redirect(url);
}

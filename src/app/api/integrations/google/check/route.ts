import { NextResponse } from "next/server";
export async function GET(){
  const hasCal = !!(process.env.GOOGLE_CALENDAR_CREDENTIALS || process.env.GOOGLE_GMAIL_CREDENTIALS);
  return NextResponse.json({ configured: hasCal, hint: hasCal ? "OAuth global configurado — 1 clique" : "Configure GOOGLE_CALENDAR_CREDENTIALS no Coolify .env uma vez (admin) — depois todos os closers só clicam Conectar" });
}

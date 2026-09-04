import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getIntegration } from "@/lib/integrations/registry";

export async function GET(req:Request){
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const max = Math.min(50, Math.max(1, Number(url.searchParams.get("max") ?? 10) || 10));

  let providerName = "mock-email";
  let cfg: Record<string,unknown> = {};
  const conn = await prisma.integrationConnection.findFirst({ where:{ organizationId, kind:"email", status:"connected" }, orderBy:{ updatedAt:"desc" } });
  if(conn){ providerName = conn.provider; cfg = (conn.config as Record<string,unknown>) ?? {}; }

  try{
    const p = getIntegration(providerName);
    if(!p.listInbox) return NextResponse.json({ items: [], provider: providerName, note:"provider does not support inbox" });
    const items = await p.listInbox(cfg, { max });
    return NextResponse.json({ items, provider: providerName });
  }catch(e){ return NextResponse.json({ error: String(e).slice(0,500), provider: providerName }, { status:502 }); }
}

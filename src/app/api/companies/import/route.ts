import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(()=>null) as { rows?: {name:string,website?:string,industry?:string}[] }|null;
  const rows = body?.rows ?? [];
  if(!rows.length) return NextResponse.json({ error:"Nenhuma linha" }, { status:400 });
  let created=0, skipped=0;
  for(const r of rows.slice(0,500)){
    if(!r.name?.trim()){ skipped++; continue; }
    const exists = await prisma.company.findFirst({ where:{ organizationId, name: r.name.trim() } });
    if(exists){ skipped++; continue; }
    await prisma.company.create({ data:{ organizationId, name: r.name.trim(), website: r.website, industry: r.industry } });
    created++;
  }
  return NextResponse.json({ created, skipped });
}

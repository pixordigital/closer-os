import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { createSequence } from "@/lib/email/sequence";
import { z } from "zod";

const schema=z.object({ dealId:z.string().cuid() });

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null);
  const p=schema.safeParse(body);
  if(!p.success) return NextResponse.json({ error: p.error.flatten() }, { status:400 });
  const created=await createSequence(organizationId, p.data.dealId);
  return NextResponse.json({ created: created.length, ids: created.map(c=>c.id) });
}
export async function GET(req:Request){
  const { organizationId } = await requireTenant();
  const { prisma } = await import("@/lib/db");
  const url=new URL(req.url);
  const dealId=url.searchParams.get("dealId");
  const where={ organizationId, ...(dealId?{dealId}:{}) };
  const items=await prisma.followUp.findMany({ where: where as never, orderBy:{ createdAt:"desc" }, take:50 });
  return NextResponse.json({ items });
}

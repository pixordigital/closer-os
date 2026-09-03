import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function POST(req:Request, { params }:{ params:Promise<{id:string}> }){
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null) as { action?: "approve"|"reject" }|null;
  const action = body?.action ?? "approve";
  const rec = await prisma.aIRecommendation.findFirst({ where:{ id, organizationId } });
  if(!rec) return NextResponse.json({ error:"Not found" }, { status:404 });
  if(action==="reject"){
    await prisma.aIRecommendation.update({ where:{ id }, data:{ dismissed:true } });
    return NextResponse.json({ ok:true, action:"rejected" });
  }
  // approve
  if(rec.type==="pipeline_move"){
    const p = rec.payload as unknown as { dealId:string, to:string };
    if(p?.dealId && p?.to){
      await prisma.deal.update({ where:{ id:p.dealId }, data:{ stage: p.to as never } });
      await prisma.auditLog.create({ data:{ organizationId, userId, action:"pipeline.move_approved", entityType:"Deal", entityId:p.dealId, metadata:{ from: (rec.payload as unknown as {from:string}).from, to:p.to } as never } as never });
    }
  }
  if(rec.type==="followup_draft"){
    const p = rec.payload as unknown as { dealId:string, callId:string };
    if(p?.dealId){
      await prisma.followUp.create({ data:{ organizationId, dealId:p.dealId, callId: p.callId ?? null, type:"EMAIL" as never, content:"Rascunho gerado pelo Outreach Pilot — revise antes de enviar", status:"DRAFT" as never } as never });
    }
  }
  await prisma.aIRecommendation.update({ where:{ id }, data:{ dismissed:true } });
  return NextResponse.json({ ok:true, action:"approved" });
}

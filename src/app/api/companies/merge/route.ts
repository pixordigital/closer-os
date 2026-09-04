import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const schema = z.object({
  sourceId: z.string().cuid(),
  targetId: z.string().cuid(),
});

export async function POST(req:Request){
  const ctx = await requireTenant();
  const { organizationId, userId } = ctx;
  const { requireRole } = await import("@/lib/permissions");
  try{ await requireRole(ctx as never, organizationId, "ADMIN"); }catch(e){ const s=(e as {status?:number})?.status ?? 403; return NextResponse.json({error:(e as Error).message},{status:s}); }
  const body = await req.json().catch(()=>null);
  const p = schema.safeParse(body);
  if(!p.success) return NextResponse.json({ error: p.error.flatten() }, { status:400 });
  const { sourceId, targetId } = p.data;
  if(sourceId===targetId) return NextResponse.json({ error:"sourceId e targetId devem ser diferentes" }, { status:400 });

  const [source, target] = await Promise.all([
    prisma.company.findFirst({ where:{ id: sourceId, organizationId }}),
    prisma.company.findFirst({ where:{ id: targetId, organizationId }}),
  ]);
  if(!source || !target) return NextResponse.json({ error:"Empresa não encontrada na organização" }, { status:404 });

  // move contacts + deals
  const [contactsMoved, dealsMoved] = await Promise.all([
    prisma.contact.updateMany({ where:{ companyId: sourceId, organizationId }, data:{ companyId: targetId }}).then(r=>r.count),
    prisma.deal.updateMany({ where:{ companyId: sourceId, organizationId }, data:{ companyId: targetId }}).then(r=>r.count),
  ]);
  // merge notes
  if(source.notes){
    await prisma.company.update({ where:{ id: targetId }, data:{ notes: [target.notes, `\n\n[Merged de ${source.name}]: ${source.notes}`].filter(Boolean).join("") }});
  }
  await prisma.company.delete({ where:{ id: sourceId }});
  await auditLog({ organizationId, userId, action:"company.merged", entityType:"Company", entityId: targetId, metadata:{ sourceId, targetId, contactsMoved, dealsMoved } as never });
  return NextResponse.json({ ok:true, targetId, contactsMoved, dealsMoved });
}

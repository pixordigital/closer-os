import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { proposalUpdateSchema } from "@/lib/validations/catalog";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, org: string) {
  const p = await prisma.proposal.findFirst({ where: { id, organizationId: org } as never, include: { deal: { select: { id: true, name: true, stage: true } } } });
  if (!p) throw Object.assign(new Error("Not found"), { status: 404 });
  return p;
}

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try { return NextResponse.json(await getScoped(id, organizationId)); } catch(e:unknown){ const s=(e as {status?:number})?.status??500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScoped(id, organizationId);
    const body = await req.json().catch(()=>null);
    const parsed = proposalUpdateSchema.safeParse(body);
    if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
    const data = { ...parsed.data } as Record<string, unknown>;
    if (Array.isArray(data.items) && data.total == null) {
      const items = data.items as Array<{ qty:number; unitPrice:number }>;
      data.total = items.reduce((s, it)=> s + Number(it.qty)*Number(it.unitPrice), 0);
    }
    const updated = await prisma.proposal.update({ where:{ id }, data: data as never });
    await auditLog({ organizationId, userId, action:"proposal.updated", entityType:"Proposal", entityId:id, metadata:{ fields:Object.keys(data) } as never });
    return NextResponse.json(updated);
  } catch(e:unknown){ const s=(e as {status?:number})?.status??500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}
export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try { await getScoped(id, organizationId); await prisma.proposal.delete({ where:{ id }}); await auditLog({ organizationId, userId, action:"proposal.deleted", entityType:"Proposal", entityId:id }); return NextResponse.json({ ok:true }); } catch(e:unknown){ const s=(e as {status?:number})?.status??500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}

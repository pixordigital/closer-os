import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { productUpdateSchema } from "@/lib/validations/catalog";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, org: string) {
  const p = await prisma.product.findFirst({ where: { id, organizationId: org } as never });
  if (!p) throw Object.assign(new Error("Not found"), { status: 404 });
  return p;
}

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try { return NextResponse.json(await getScoped(id, organizationId)); } catch (e: unknown) { const s = (e as {status?:number})?.status ?? 500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScoped(id, organizationId);
    const body = await req.json().catch(()=>null);
    const parsed = productUpdateSchema.safeParse(body);
    if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
    if(parsed.data.sku){
      const dup = await prisma.product.findFirst({ where:{ organizationId, sku: parsed.data.sku, id:{ not: id } } as never, select:{id:true}});
      if(dup) return NextResponse.json({ error:"SKU já existe", existingId: dup.id }, { status:409 });
    }
    const updated = await prisma.product.update({ where:{ id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action:"product.updated", entityType:"Product", entityId:id });
    return NextResponse.json(updated);
  } catch(e:unknown){ const s=(e as {status?:number})?.status??500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}
export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try { await getScoped(id, organizationId); await prisma.product.delete({ where:{ id }}); await auditLog({ organizationId, userId, action:"product.deleted", entityType:"Product", entityId:id }); return NextResponse.json({ ok:true }); } catch(e:unknown){ const s=(e as {status?:number})?.status??500; return NextResponse.json({ error:(e as Error).message },{status:s});}
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { taskUpdateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, organizationId: string) {
  const t = await prisma.task.findFirst({ where: { id, organizationId } });
  if (!t) throw Object.assign(new Error("Not found"), { status: 404 });
  return t;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const task = await getScoped(id, organizationId);
    return NextResponse.json(task);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScoped(id, organizationId);
    const body = await req.json().catch(() => null);
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    const updated = await prisma.task.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "task.updated", entityType: "Task", entityId: id });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScoped(id, organizationId);
    await prisma.task.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "task.deleted", entityType: "Task", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

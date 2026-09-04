import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { callUpdateSchema } from "@/lib/validations/call";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import { enqueueJob } from "@/lib/jobs";

async function getScoped(id: string, organizationId: string) {
  const c = await prisma.call.findFirst({
    where: { id, organizationId },
    include: { deal: { select: { id: true, name: true } }, transcript: true },
  });
  if (!c) throw Object.assign(new Error("Not found"), { status: 404 });
  return c;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const call = await getScoped(id, organizationId);
    return NextResponse.json(call);
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
    const parsed = callUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
      if (!deal) return NextResponse.json({ error: "Deal not found in organization" }, { status: 404 });
    }
    if (parsed.data.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, organizationId } });
      if (!contact) return NextResponse.json({ error: "Contact not found in organization" }, { status: 404 });
    }

    const updated = await prisma.call.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "call.updated", entityType: "Call", entityId: id });
    if ((parsed.data as { status?: string }).status === "COMPLETED") {
      fireTriggers({ organizationId, event: "call.completed", payload: { id, callId: id, dealId: updated.dealId, status: updated.status }, idempotencyKey: `call.completed:${id}` });
    }
    const sched = (parsed.data as { scheduledAt?: Date | null }).scheduledAt;
    if (sched) {
      const d = new Date(sched as unknown as string); const runAt = new Date(d); runAt.setDate(runAt.getDate()-1); runAt.setHours(9,0,0,0);
      if (runAt.getTime() > Date.now()+60_000) void enqueueJob({ organizationId, type:"whatsapp_reminder_d1" as never, payload:{ organizationId, callId:id }, runAt }).catch(()=>{});
    }
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
    await prisma.call.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "call.deleted", entityType: "Call", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

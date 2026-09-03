import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { dealUpdateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import { validateStageGate } from "@/lib/stage-gates";
import { computeHealth } from "@/lib/discovery";

async function getScoped(id: string, organizationId: string) {
  const d = await prisma.deal.findFirst({ where: { id, organizationId } });
  if (!d) throw Object.assign(new Error("Not found"), { status: 404 });
  return d;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const deal = await prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        company: { select: { id: true, name: true, website: true, industry: true } },
        primaryContact: true,
        calls: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(deal);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    const current = await getScoped(id, organizationId);
    const body = await req.json().catch(() => null);
    const parsed = dealUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    // Validate FKs if changed
    if (parsed.data.companyId) {
      const c = await prisma.company.findFirst({ where: { id: parsed.data.companyId, organizationId } });
      if (!c) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (parsed.data.primaryContactId) {
      const ct = await prisma.contact.findFirst({ where: { id: parsed.data.primaryContactId as string, organizationId } });
      if (!ct) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    // Stage gate — guard central (ponytail: 1 lugar, não em cada caller)
    if (parsed.data.stage && parsed.data.stage !== current.stage) {
      const merged = { ...current, ...parsed.data } as Record<string, unknown>;
      let discoveryHealth: number | undefined;
      if (parsed.data.stage === "PROPOSAL") {
        const fields = await prisma.discoveryField.findMany({ where: { dealId: id }, select: { key:true, status:true } });
        discoveryHealth = computeHealth(fields);
      }
      const gate = validateStageGate(parsed.data.stage, merged as never, { discoveryHealth });
      if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: 400 });
    }
    const updated = await prisma.deal.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "deal.updated", entityType: "Deal", entityId: id, metadata: { fields: Object.keys(parsed.data) } });
    fireTriggers({ organizationId, event: "deal.updated", payload: { id, ...parsed.data }, idempotencyKey: `deal.updated:${id}:${Date.now()}` });
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
    await prisma.deal.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "deal.deleted", entityType: "Deal", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

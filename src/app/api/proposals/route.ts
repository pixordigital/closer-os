import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { proposalCreateSchema } from "@/lib/validations/catalog";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import crypto from "crypto";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const where: Record<string, unknown> = { organizationId, ...(dealId ? { dealId } : {}) };
  const [items, total] = await Promise.all([
    prisma.proposal.findMany({ where: where as never, orderBy: { createdAt: "desc" }, include: { deal: { select: { id: true, name: true } } } }),
    prisma.proposal.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = proposalCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { dealId, title, html, items, total, currency, expiresAt } = parsed.data;
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  // compute total from items if not provided
  let computed: number | null = total != null ? Number(total) : null;
  if (computed == null && items?.length) {
    computed = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice), 0);
  }
  if (computed == null && deal.value != null) computed = Number(deal.value);
  const token = crypto.randomBytes(16).toString("hex");
  const proposal = await prisma.proposal.create({
    data: { organizationId, dealId, createdBy: userId, token, title, html: html ?? null, items: items ?? undefined, total: computed, currency: currency ?? "BRL", expiresAt } as never,
  });
  await auditLog({ organizationId, userId, action: "proposal.created", entityType: "Proposal", entityId: proposal.id, metadata: { dealId, token } as never });
  fireTriggers({ organizationId, event: "proposal.created", payload: { id: proposal.id, dealId, token }, idempotencyKey: `proposal.created:${proposal.id}` });
  return NextResponse.json(proposal, { status: 201 });
}

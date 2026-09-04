import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { dealCreateSchema } from "@/lib/validations/crm";
import { DISCOVERY_KEYS } from "@/lib/discovery";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import { enqueueJob } from "@/lib/jobs";
import { getOrgRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const stage = url.searchParams.get("stage")?.trim().toUpperCase() || undefined;
  const companyId = url.searchParams.get("companyId")?.trim() || undefined;
  const ownerIdParam = url.searchParams.get("ownerId")?.trim() || undefined;
  const mine = url.searchParams.get("mine")?.trim().toLowerCase();
  let ownerId = mine === "1" || mine === "true" ? userId : (ownerIdParam || undefined);
  // ponytail: MEMBER só vê seus deals — guard no shared route, não em cada caller
  const role = await getOrgRole(userId, organizationId);
  if (role === "MEMBER") ownerId = userId;

  const where: Record<string, unknown> = {
    organizationId,
    ...(stage ? { stage } : {}),
    ...(companyId ? { companyId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { painSummary: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where: where as never,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        company: { select: { id: true, name: true } },
        primaryContact: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = dealCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { companyId, primaryContactId } = parsed.data;
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId } });
  if (!company) return NextResponse.json({ error: "Company not found in organization" }, { status: 404 });
  if (primaryContactId) {
    const contact = await prisma.contact.findFirst({ where: { id: primaryContactId, organizationId } });
    if (!contact) return NextResponse.json({ error: "Contact not found in organization" }, { status: 404 });
  }
  let ownerId = (parsed.data as { ownerId?: string | null }).ownerId?.trim() || userId;
  // MEMBER não pode criar deal para outro owner
  const role = await getOrgRole(userId, organizationId);
  if (role === "MEMBER") ownerId = userId;
  else if (ownerId !== userId) {
    const mem = await prisma.membership.findFirst({ where: { userId: ownerId, organizationId }, select: { userId: true } });
    if (!mem) return NextResponse.json({ error: "ownerId não pertence à organização" }, { status: 400 });
  }

  const deal = await prisma.deal.create({
    data: { organizationId, ...parsed.data, ownerId } as never,
  });
  await prisma.discoveryField.createMany({
    data: DISCOVERY_KEYS.map((key) => ({ dealId: deal.id, key, status: "UNKNOWN" as const, source: "CRM" as const })),
    skipDuplicates: true,
  });
  await auditLog({ organizationId, userId, action: "deal.created", entityType: "Deal", entityId: deal.id });
  fireTriggers({ organizationId, event: "deal.created", payload: { id: deal.id, companyId: deal.companyId, stage: deal.stage, ownerId }, idempotencyKey: `deal.created:${deal.id}` });
  const nd = (parsed.data as { nextStepDate?: Date | null }).nextStepDate;
  if (nd) {
    const d = new Date(nd);
    const runAt = new Date(d); runAt.setDate(runAt.getDate() - 1); runAt.setHours(9,0,0,0);
    if (runAt.getTime() > Date.now() + 60_000) void enqueueJob({ organizationId, type: "whatsapp_reminder_d1" as never, payload: { organizationId, dealId: deal.id }, runAt }).catch(()=>{});
  }
  return NextResponse.json(deal, { status: 201 });
}

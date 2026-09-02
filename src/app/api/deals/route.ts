import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { dealCreateSchema } from "@/lib/validations/crm";
import { DISCOVERY_KEYS } from "@/lib/discovery";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const stage = url.searchParams.get("stage")?.trim().toUpperCase() || undefined;
  const companyId = url.searchParams.get("companyId")?.trim() || undefined;

  const where: Record<string, unknown> = {
    organizationId,
    ...(stage ? { stage } : {}),
    ...(companyId ? { companyId } : {}),
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

  const deal = await prisma.deal.create({
    data: { organizationId, ...parsed.data } as never,
  });
  await prisma.discoveryField.createMany({
    data: DISCOVERY_KEYS.map((key) => ({ dealId: deal.id, key, status: "UNKNOWN" as const, source: "CRM" as const })),
    skipDuplicates: true,
  });
  await auditLog({ organizationId, userId, action: "deal.created", entityType: "Deal", entityId: deal.id });
  return NextResponse.json(deal, { status: 201 });
}

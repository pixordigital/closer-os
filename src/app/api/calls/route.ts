import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { callCreateSchema } from "@/lib/validations/call";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const contactId = url.searchParams.get("contactId")?.trim() || undefined;

  const where: Record<string, unknown> = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...(contactId ? { contactId } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        deal: { select: { id: true, name: true } },
        transcript: { select: { id: true } },
      },
    }),
    prisma.call.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = callCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal not found in organization" }, { status: 404 });
  }
  if (parsed.data.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, organizationId } });
    if (!contact) return NextResponse.json({ error: "Contact not found in organization" }, { status: 404 });
  }

  const call = await prisma.call.create({
    data: { organizationId, ...parsed.data } as never,
  });
  await auditLog({ organizationId, userId, action: "call.created", entityType: "Call", entityId: call.id });
  return NextResponse.json(call, { status: 201 });
}

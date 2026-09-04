import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { contactCreateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const companyId = url.searchParams.get("companyId")?.trim() || undefined;
  const where: Record<string, unknown> = {
    organizationId,
    ...(companyId ? { companyId } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.contact.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, organizationId } });
  if (!company) return NextResponse.json({ error: "Company not found in organization" }, { status: 404 });
  if (parsed.data.email) {
    const emailLower = parsed.data.email.trim().toLowerCase();
    const dup = await prisma.contact.findFirst({ where: { organizationId, email: { equals: emailLower, mode: "insensitive" as const } } as never, select: { id: true } });
    if (dup) return NextResponse.json({ error: "Contato com esse email já existe", existingId: dup.id }, { status: 409 });
  }
  const contact = await prisma.contact.create({ data: { organizationId, ...parsed.data, ...(parsed.data.email ? { email: parsed.data.email.trim().toLowerCase() } : {}) } as never });
  await auditLog({ organizationId, userId, action: "contact.created", entityType: "Contact", entityId: contact.id });
  return NextResponse.json(contact, { status: 201 });
}

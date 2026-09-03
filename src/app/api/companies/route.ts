import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { companyCreateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const { page, limit, skip, q } = parsePagination(new URL(req.url));
  const where = {
    organizationId,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.company.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit, include: { _count: { select: { deals: true, contacts: true } } } }),
    prisma.company.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = companyCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // dedupe por nome (case-insensitive) dentro da org — evita duplicatas
  const dup = await prisma.company.findFirst({ where:{ organizationId, name:{ equals: parsed.data.name, mode:"insensitive" as const } }, select:{ id:true } });
  if (dup) return NextResponse.json({ error:"Empresa já existe nesta organização", existingId: dup.id }, { status:409 });
  const company = await prisma.company.create({ data: { organizationId, ...parsed.data } });
  await auditLog({ organizationId, userId, action: "company.created", entityType: "Company", entityId: company.id });
  return NextResponse.json(company, { status: 201 });
}

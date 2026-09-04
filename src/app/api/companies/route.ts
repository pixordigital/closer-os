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
  const cnpjDigits = parsed.data.cnpj?.replace(/\D/g, "") || undefined;
  if (cnpjDigits) {
    const dupCnpj = await prisma.company.findFirst({ where: { organizationId, cnpj: cnpjDigits } as never, select: { id: true } });
    if (dupCnpj) return NextResponse.json({ error: "CNPJ já cadastrado", existingId: dupCnpj.id }, { status: 409 });
  }
  const dup = await prisma.company.findFirst({ where:{ organizationId, name:{ equals: parsed.data.name, mode:"insensitive" as const } }, select:{ id:true } });
  if (dup) return NextResponse.json({ error:"Empresa já existe nesta organização", existingId: dup.id }, { status:409 });
  const company = await prisma.company.create({ data: { organizationId, ...parsed.data, ...(cnpjDigits ? { cnpj: cnpjDigits } : {}) } as never });
  await auditLog({ organizationId, userId, action: "company.created", entityType: "Company", entityId: company.id });
  return NextResponse.json(company, { status: 201 });
}

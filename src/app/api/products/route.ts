import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { productCreateSchema } from "@/lib/validations/catalog";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const active = url.searchParams.get("active");
  const where: Record<string, unknown> = {
    organizationId,
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.product.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.sku) {
    const dup = await prisma.product.findFirst({ where: { organizationId, sku: parsed.data.sku } as never, select: { id: true } });
    if (dup) return NextResponse.json({ error: "SKU já existe", existingId: dup.id }, { status: 409 });
  }
  const product = await prisma.product.create({ data: { organizationId, ...parsed.data } as never });
  await auditLog({ organizationId, userId, action: "product.created", entityType: "Product", entityId: product.id });
  return NextResponse.json(product, { status: 201 });
}

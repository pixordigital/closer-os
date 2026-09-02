import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const where: Record<string, unknown> = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.followUp.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take: limit, include: { deal: { select: { id: true, name: true } } } }),
    prisma.followUp.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

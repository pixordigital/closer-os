import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { taskCreateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

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
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { deal: { select: { id: true, name: true } } },
    }),
    prisma.task.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal not found in organization" }, { status: 404 });
  }
  const task = await prisma.task.create({ data: { organizationId, ...parsed.data } as never });
  await auditLog({ organizationId, userId, action: "task.created", entityType: "Task", entityId: task.id });
  return NextResponse.json(task, { status: 201 });
}

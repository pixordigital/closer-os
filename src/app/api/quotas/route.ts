import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { quotaCreateSchema } from "@/lib/validations/catalog";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const period = url.searchParams.get("period")?.trim() || undefined;
  const userId = url.searchParams.get("userId")?.trim() || undefined;
  const where: Record<string, unknown> = { organizationId, ...(period ? { period } : {}), ...(userId ? { userId } : {}) };
  const [items, members] = await Promise.all([
    prisma.quota.findMany({ where: where as never, orderBy: { period: "desc" } }),
    prisma.membership.findMany({ where: { organizationId }, include: { user: { select: { id: true, name: true, email: true } } } }),
  ]);
  const memberMap = new Map(members.map((m) => [m.userId, m.user]));
  // attach achieved per quota (WON value in period)
  const enriched = await Promise.all(
    items.map(async (q) => {
      const v = q as unknown as { userId: string; period: string; target: unknown };
      const [y, mo] = v.period.split("-").map(Number);
      const start = new Date(y, (mo ?? 1) - 1, 1);
      const end = new Date(y, (mo ?? 1), 0, 23, 59, 59, 999);
      const agg = await prisma.deal.aggregate({ where: { organizationId, ownerId: v.userId, stage: "WON" as never, updatedAt: { gte: start, lte: end } } as never, _sum: { value: true } });
      const achieved = Number((agg as { _sum: { value: unknown } })._sum.value ?? 0);
      const target = Number(v.target as unknown as string);
      return { ...q, achieved, pct: target ? Math.round((achieved / target) * 100) : 0, user: memberMap.get(v.userId) ?? null };
    })
  );
  return NextResponse.json({ items: enriched });
}

export async function POST(req: Request) {
  const { organizationId, userId: actorId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = quotaCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, period, target } = parsed.data;
  const mem = await prisma.membership.findFirst({ where: { userId, organizationId }, select: { userId: true } });
  if (!mem) return NextResponse.json({ error: "userId não pertence à organização" }, { status: 400 });
  const quota = await prisma.quota.upsert({
    where: { organizationId_userId_period: { organizationId, userId, period } } as never,
    create: { organizationId, userId, period, target } as never,
    update: { target } as never,
  });
  await auditLog({ organizationId, userId: actorId, action: "quota.upsert", entityType: "Quota", entityId: quota.id, metadata: { userId, period, target } as never });
  return NextResponse.json(quota, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { getOrgRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const role = await getOrgRole(userId, organizationId);
  if (role === "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const period = body.period ?? new Date().toISOString().slice(0, 7);
  const mine = (body.mine ?? "").trim().toLowerCase();
  const scopeAll = (mine === "0" || mine === "false") && role !== "MEMBER" as unknown as string;

  // Get all users with deals if org-level snapshot
  const userIds = scopeAll
    ? (await prisma.membership.findMany({ where: { organizationId }, select: { userId: true } })).map(m => m.userId)
    : [userId];

  const results = [];
  for (const uid of userIds) {
    const ownerFilter = scopeAll ? { ownerId: uid } : { ownerId: userId };
    const whereOwner = { organizationId, ...ownerFilter };

    const byCat = await prisma.deal.groupBy({
      by: ["forecastCategory"],
      where: { ...whereOwner, stage: { notIn: ["WON", "LOST"] } },
      _count: { forecastCategory: true },
      _sum: { value: true },
    });

    for (const cat of ["PIPELINE", "COMMIT", "BEST_CASE", "UPSIDE", "CLOSED_WON", "CLOSED_LOST"] as const) {
      const match = byCat.find(b => b.forecastCategory === cat);
      await prisma.forecastSnapshot.upsert({
        where: { organizationId_userId_period_category: { organizationId, userId: uid, period, category: cat } },
        update: { amount: match?._sum.value ?? 0, dealsCount: match?._count.forecastCategory ?? 0 },
        create: { organizationId, userId: uid, period, category: cat, amount: match?._sum.value ?? 0, dealsCount: match?._count.forecastCategory ?? 0 },
      });
      results.push({ userId: uid, category: cat, amount: Number(match?._sum.value ?? 0), count: match?._count.forecastCategory ?? 0 });
    }
  }

  return NextResponse.json({ period, snapshots: results });
}

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  const snapshots = await prisma.forecastSnapshot.findMany({
    where: { organizationId, period },
    orderBy: [{ userId: "asc" }, { category: "asc" }],
  });

  return NextResponse.json({ period, snapshots });
}
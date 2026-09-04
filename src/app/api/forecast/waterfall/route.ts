import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { getOrgRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const role = await getOrgRole(userId, organizationId);
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const mine = (url.searchParams.get("mine") ?? "").trim().toLowerCase();
  const scopeAll = (mine === "0" || mine === "false") && role !== "MEMBER";
  const ownerFilter = scopeAll ? {} : { ownerId: userId };

  const whereOwner = { organizationId, ...ownerFilter };

  // Current pipeline by category
  const pipelineByCat = await prisma.deal.groupBy({
    by: ["forecastCategory"],
    where: { ...whereOwner, stage: { notIn: ["WON", "LOST"] } },
    _count: { forecastCategory: true },
    _sum: { value: true },
  });

  // Won/Lost this period
  const periodStart = new Date(`${period}-01`);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [won, lost, prevSnapshot] = await Promise.all([
    prisma.deal.groupBy({
      by: ["forecastCategory"],
      where: { ...whereOwner, stage: "WON", updatedAt: { gte: periodStart, lt: periodEnd } },
      _count: { forecastCategory: true },
      _sum: { value: true },
    }),
    prisma.deal.groupBy({
      by: ["forecastCategory"],
      where: { ...whereOwner, stage: "LOST", updatedAt: { gte: periodStart, lt: periodEnd } },
      _count: { forecastCategory: true },
      _sum: { value: true },
    }),
    prisma.forecastSnapshot.findMany({
      where: { organizationId, period, ...(scopeAll ? {} : { userId }) },
    }),
  ]);

  const catOrder = ["PIPELINE", "COMMIT", "BEST_CASE", "UPSIDE"];
  const waterfall = catOrder.map(cat => {
    const pipe = pipelineByCat.find(p => p.forecastCategory === cat);
    const w = won.find(p => p.forecastCategory === cat);
    const l = lost.find(p => p.forecastCategory === cat);
    const snap = prevSnapshot.find(s => s.category === cat);
    return {
      category: cat,
      pipeline: { count: pipe?._count.forecastCategory ?? 0, value: Number(pipe?._sum.value ?? 0) },
      committed: snap ? Number(snap.amount) : 0,
      won: { count: w?._count.forecastCategory ?? 0, value: Number(w?._sum.value ?? 0) },
      lost: { count: l?._count.forecastCategory ?? 0, value: Number(l?._sum.value ?? 0) },
      net: (snap ? Number(snap.amount) : 0) + Number(w?._sum.value ?? 0) - Number(l?._sum.value ?? 0),
    };
  });

  // Previous period comparison
  const prevPeriod = new Date(periodStart);
  prevPeriod.setMonth(prevPeriod.getMonth() - 1);
  const prevPeriodStr = prevPeriod.toISOString().slice(0, 7);

  const prevSnapshots = await prisma.forecastSnapshot.findMany({
    where: { organizationId, period: prevPeriodStr, ...(scopeAll ? {} : { userId }) },
  });

  return NextResponse.json({ period, prevPeriod: prevPeriodStr, waterfall, prevSnapshots });
}
// @ts-nocheck
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

  // Pipeline by stage + forecast categories
  const whereOwner = { organizationId, ...ownerFilter };

  const [pipeline, forecasts, deals] = await Promise.all([
    prisma.deal.groupBy({
      by: ["stage", "forecastCategory"],
      where: { ...whereOwner, stage: { notIn: ["WON", "LOST"] } },
      _count: { stage: true },
      _sum: { value: true },
    }),
    prisma.forecastSnapshot.findMany({
      where: { organizationId, period, ...(scopeAll ? {} : { userId }) },
    }),
    prisma.deal.findMany({
      where: { ...whereOwner, stage: { notIn: ["WON", "LOST"] } },
      select: { id: true, name: true, stage: true, value: true, currency: true, probability: true, expectedCloseDate: true, forecastCategory: true, ownerId: true, commitDate: true, commitNote: true },
      orderBy: [{ forecastCategory: "asc" }, { value: "desc" }],
    }),
  ]);

  const stageOrder = ["LEAD", "QUALIFIED", "DISCOVERY", "SOLUTION", "PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT"];
  const catOrder = ["PIPELINE", "COMMIT", "BEST_CASE", "UPSIDE"];

  const pipelineByStage = stageOrder.map(stage => {
    const cats = catOrder.map(cat => {
      const match = pipeline.find(p => p.stage === stage && p.forecastCategory === cat);
      return {
        category: cat,
        count: match?._count.stage ?? 0,
        value: Number(match?._sum.value ?? 0),
      };
    });
    const total = cats.reduce((a, c) => a + c.value, 0);
    return { stage, categories: cats, total };
  });

  const forecastByCat = catOrder.map(cat => {
    const snap = forecasts.find(f => f.category === cat);
    const catDeals = deals.filter(d => d.forecastCategory === cat);
    return {
      category: cat,
      count: catDeals.length,
      weighted: catDeals.reduce((a, d) => a + Number(d.value ?? 0) * ((d.probability ?? 30) / 100), 0),
      committed: snap ? Number(snap.amount) : 0,
      deals: catDeals.map(d => ({
        id: d.id, name: d.name, stage: d.stage, value: Number(d.value ?? 0),
        probability: d.probability ?? 30, expectedCloseDate: d.expectedCloseDate,
        commitDate: d.commitDate, commitNote: d.commitNote,
      })),
    };
  });

  const totals = {
    pipeline: pipelineByStage.reduce((a, s) => a + s.total, 0),
    commit: forecastByCat.find(f => f.category === "COMMIT")?.committed ?? 0,
    bestCase: forecastByCat.find(f => f.category === "BEST_CASE")?.weighted ?? 0,
    upside: forecastByCat.find(f => f.category === "UPSIDE")?.weighted ?? 0,
  };

  return NextResponse.json({ period, pipelineByStage, forecastByCat, totals });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const { dealId, forecastCategory, commitDate, commitNote } = body;

  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: {
      forecastCategory,
      commitDate: commitDate ? new Date(commitDate) : null,
      commitNote: commitNote ?? null,
    },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "deal.forecast_updated", entityType: "Deal", entityId: dealId, metadata: { forecastCategory, commitDate, commitNote } },
  });

  return NextResponse.json({ deal: updated });
}
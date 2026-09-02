import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { computeDealRisk } from "@/lib/deal-risk";

export async function GET() {
  const { organizationId } = await requireTenant();
  const deals = await prisma.deal.findMany({
    where: { organizationId, stage: { notIn: ["WON","LOST"] as never } },
    include: { discoveryFields: { select: { key: true, status: true } }, company: { select: { name: true } }, _count: { select: { objections: true } } },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  // fetch competitor objection presence per deal in one query
  const objectionDeals = new Set<string>();
  if (deals.length) {
    const comp = await prisma.objection.findMany({ where: { organizationId, category: "COMPETITION" as never, dealId: { in: deals.map(d=>d.id) } }, select: { dealId: true } });
    for (const o of comp) if (o.dealId) objectionDeals.add(o.dealId);
  }

  const items = deals.map(d=>{
    const r = computeDealRisk({
      discoveryFields: d.discoveryFields,
      deal: { nextStep: d.nextStep, updatedAt: d.updatedAt, stage: String(d.stage) },
      objectionsCount: d._count.objections,
      hasCompetitorObjection: objectionDeals.has(d.id),
    } as never);
    return { id: d.id, name: d.name, company: d.company?.name ?? null, stage: d.stage, ...r };
  });
  items.sort((a,b)=>b.score-a.score);
  return NextResponse.json({ items });
}

import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function GET() {
  const { organizationId } = await requireTenant();

  const [byStage, total, won, lost, dealsWon, lostReasons, activities] = await Promise.all([
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId }, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.count({ where:{ organizationId } }),
    prisma.deal.count({ where:{ organizationId, stage:"WON" as never } }),
    prisma.deal.count({ where:{ organizationId, stage:"LOST" as never } }),
    prisma.deal.findMany({ where:{ organizationId, stage:"WON" as never }, select:{ createdAt:true, updatedAt:true, value:true } }),
    prisma.deal.groupBy({ by:["lostReason"], where:{ organizationId, stage:"LOST" as never, lostReason:{ not: null as never } }, _count:{ lostReason:true } }),
    prisma.auditLog.groupBy({ by:["action"], where:{ organizationId, createdAt:{ gte: new Date(Date.now()-30*86400000) } }, _count:{ action:true } }),
  ]);

  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const sorted = [...byStage].sort((a,b)=> stageOrder.indexOf(a.stage as string) - stageOrder.indexOf(b.stage as string));
  const funnel = sorted.map(s => ({
    stage: s.stage,
    count: s._count.stage,
    value: Number(s._sum.value ?? 0),
    conv: total ? Math.round(s._count.stage/total*100) : 0,
  }));

  const closed = won + lost;
  const winRate = closed ? Math.round(won/closed*100) : 0;

  let avgCycleDays: number | null = null;
  if (dealsWon.length) {
    const days = dealsWon.map(d => (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime())/86400000);
    avgCycleDays = Math.round(days.reduce((a,b)=>a+b,0)/days.length);
  }

  const lostByReason = lostReasons.map(r=>({ reason: (r.lostReason as string) ?? "—", count: (r as unknown as {_count:{lostReason:number}})._count.lostReason }));

  return NextResponse.json({ funnel, total, won, lost, winRate, avgCycleDays, lostByReason, activities });
}

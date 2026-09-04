import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getOrgRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const ownerIdParam = url.searchParams.get("ownerId")?.trim() || undefined;
  const mine = url.searchParams.get("mine")?.trim().toLowerCase();
  let ownerId = mine === "1" || mine === "true" ? userId : (ownerIdParam || undefined);
  const role = await getOrgRole(userId, organizationId);
  if (role === "MEMBER") ownerId = userId;
  const whereOwner = ownerId ? { organizationId, ownerId } : { organizationId };
  const [byStage, total, won, lost, dealsWon, lostReasons, activities, quotasRaw] = await Promise.all([
    prisma.deal.groupBy({ by:["stage"], where: whereOwner, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.count({ where: whereOwner }),
    prisma.deal.count({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"WON" as never } }),
    prisma.deal.count({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"LOST" as never } }),
    prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"WON" as never }, select:{ createdAt:true, updatedAt:true, value:true, ownerId:true } }),
    prisma.deal.groupBy({ by:["lostReason"], where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"LOST" as never, lostReason:{ not: null as never } }, _count:{ lostReason:true } }),
    prisma.auditLog.groupBy({ by:["action"], where:{ organizationId, createdAt:{ gte: new Date(Date.now()-30*86400000) } }, _count:{ action:true } }),
    // forecast: weighted value not WON/LOST
    prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:{ notIn:["WON","LOST"] as never } }, select:{ value:true, probability:true, ownerId:true } }),
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
    const days = dealsWon.map(d => (new Date((d as {updatedAt:Date}).updatedAt).getTime() - new Date((d as {createdAt:Date}).createdAt).getTime())/86400000);
    avgCycleDays = Math.round(days.reduce((a,b)=>a+b,0)/days.length);
  }

  const lostByReason = lostReasons.map(r=>({ reason: (r.lostReason as string) ?? "—", count: (r as unknown as {_count:{lostReason:number}})._count.lostReason }));
  const forecastWeighted = quotasRaw.reduce((a,d)=> a + Number((d as {value:unknown}).value ?? 0) * (((d as {probability:number|null}).probability ?? 30)/100),0);

  // per-closer breakdown (only when not filtered to single owner)
  let perCloser: Array<{ ownerId: string; name: string; email: string; deals: number; won: number; forecast: number }> | null = null;
  if (!ownerId) {
    const members = await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{ id:true, name:true, email:true } } } });
    const grouped = await prisma.deal.groupBy({ by:["ownerId"], where:{ organizationId, ownerId:{ not: null as never } } as never, _count:{ ownerId:true } });
    const wonBy = await prisma.deal.groupBy({ by:["ownerId"], where:{ organizationId, stage:"WON" as never } as never, _count:{ ownerId:true }, _sum:{ value:true } });
    const wonMap = new Map(wonBy.map(r=>[(r as {ownerId:string}).ownerId, r] as const));
    const forecastBy: Record<string,number> = {};
    for (const d of quotasRaw as unknown as Array<{ownerId:string|null;value:unknown;probability:number|null}>) {
      if(!d.ownerId) continue;
      forecastBy[d.ownerId] = (forecastBy[d.ownerId]??0) + Number(d.value ?? 0)*((d.probability??30)/100);
    }
    perCloser = members.map(m=>({
      ownerId: m.userId,
      name: m.user.name,
      email: m.user.email,
      deals: (grouped.find(g=> (g as {ownerId:string}).ownerId===m.userId) as unknown as {_count:{ownerId:number}} | undefined)?._count.ownerId ?? 0,
      won: (wonMap.get(m.userId) as unknown as {_count:{ownerId:number}} | undefined)?._count.ownerId ?? 0,
      forecast: Math.round(forecastBy[m.userId] ?? 0),
    }));
  }

  return NextResponse.json({ funnel, total, won, lost, winRate, avgCycleDays, lostByReason, activities, forecastWeighted: Math.round(forecastWeighted), perCloser, ownerId: ownerId ?? null });
}

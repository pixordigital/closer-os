import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function GET(req:Request){
  const { organizationId }=await requireTenant();
  const url=new URL(req.url);
  const period=url.searchParams.get("period") ?? new Date().toISOString().slice(0,7);
  const [bySource, byStage, quotas, deals] = await Promise.all([
    prisma.deal.groupBy({ by:["source"], where:{ organizationId }, _count:{ source:true }, _sum:{ value:true } }),
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId }, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.quota.findMany({ where:{ organizationId, period } }),
    prisma.deal.findMany({ where:{ organizationId, createdAt:{ gte: new Date(period+"-01") } } as never, select:{ value:true, stage:true, ownerId:true, createdAt:true } }),
  ]);
  const totalValue=deals.reduce((a,d)=>a+Number((d as {value:unknown}).value??0),0);
  const wonValue=deals.filter(d=>d.stage==="WON").reduce((a,d)=>a+Number((d as {value:unknown}).value??0),0);
  const quotaTotal=quotas.reduce((a,q)=>a+Number((q as {target:unknown}).target as string),0);
  const cacProxy = deals.length? Math.round(totalValue/Math.max(1,deals.length)) : 0;
  return NextResponse.json({ period, totalValue, wonValue, quotaTotal, attainment: quotaTotal? Math.round(wonValue/quotaTotal*100): null, bySource, byStage, cacProxy, deals: deals.length });
}

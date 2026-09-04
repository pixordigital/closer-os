import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

// ponytail: counts for Hoje badge + mobile — reuse today logic light
export async function GET(){
  const { organizationId } = await requireTenant();
  const start=new Date(); start.setHours(0,0,0,0);
  const end=new Date(); end.setHours(23,59,59,999);
  const staleCut=new Date(Date.now()-7*864e5);
  const [overdue, dueToday, noNextStep, stale, pendingFollowUps] = await Promise.all([
    prisma.task.count({ where:{ organizationId, status:{in:["TODO","IN_PROGRESS"] as never}, dueDate:{lt:start}}}),
    prisma.task.count({ where:{ organizationId, status:{in:["TODO","IN_PROGRESS"] as never}, dueDate:{gte:start,lte:end}}}),
    prisma.deal.count({ where:{ organizationId, stage:{notIn:["WON","LOST"] as never}, OR:[{nextStep:null},{nextStep:""}]}}),
    prisma.deal.count({ where:{ organizationId, stage:{notIn:["WON","LOST"] as never}, updatedAt:{lt:staleCut}}}),
    prisma.followUp.count({ where:{ organizationId, status:{in:["DRAFT","PENDING_REVIEW"] as never}}}),
  ]);
  const total = overdue + dueToday + noNextStep + stale;
  return NextResponse.json({ overdue, dueToday, noNextStep, stale, pendingFollowUps, total, hasAlerts: total>0 });
}

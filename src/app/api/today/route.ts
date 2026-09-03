import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function GET() {
  const { organizationId } = await requireTenant();
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setHours(23,59,59,999);
  const staleCut = new Date(Date.now() - 7*86400000);

  const [overdue, dueToday, noNextStep, stale, callsToday, pendingFollowUps, tasksTodo] = await Promise.all([
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] as never }, dueDate:{ lt: start } }, orderBy:{ dueDate:"asc" }, take:20, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] as never }, dueDate:{ gte: start, lte: end } }, orderBy:{ dueDate:"asc" }, take:20, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] as never }, OR:[{ nextStep:null },{ nextStep:"" }] }, orderBy:{ updatedAt:"desc" }, take:20, select:{ id:true, name:true, stage:true, value:true, currency:true, company:{ select:{ name:true } } } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] as never }, updatedAt:{ lt: staleCut } }, orderBy:{ value:"desc" }, take:20, select:{ id:true, name:true, stage:true, value:true, currency:true, updatedAt:true, company:{ select:{ name:true } } } }),
    prisma.call.findMany({ where:{ organizationId, scheduledAt:{ gte: start, lte: end } }, orderBy:{ scheduledAt:"asc" }, take:20, select:{ id:true, title:true, status:true, scheduledAt:true, deal:{ select:{ id:true, name:true } } } }),
    prisma.followUp.findMany({ where:{ organizationId, status:{ in:["DRAFT","PENDING_REVIEW"] as never } }, orderBy:{ createdAt:"desc" }, take:20, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.task.count({ where:{ organizationId, status:"TODO" as never } }),
  ]);

  return NextResponse.json({ overdue, dueToday, noNextStep, stale, callsToday, pendingFollowUps, counts:{ overdue: overdue.length, dueToday: dueToday.length, noNextStep: noNextStep.length, stale: stale.length, callsToday: callsToday.length, pendingFollowUps: pendingFollowUps.length, tasksTodo } });
}

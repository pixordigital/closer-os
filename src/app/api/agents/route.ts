import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { AGENTS, runAllAgents } from "@/lib/agents/autonomous";

export async function GET(){
  const { organizationId } = await requireTenant();
  const pending = await prisma.aIRecommendation.findMany({ where:{ organizationId, dismissed:false, type:{ in:["hygiene_proposal","pipeline_move","followup_draft"] } }, orderBy:{ createdAt:"desc" }, take:50 });
  const recentRuns = await prisma.auditLog.findMany({ where:{ organizationId, action:{ in:["call.analyzed","pipeline.move_proposed"] } }, orderBy:{ createdAt:"desc" }, take:20 });
  return NextResponse.json({ agents: AGENTS, pending, recentRuns });
}

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(()=>null) as { trigger?:string, payload?:Record<string,unknown> }|null;
  const trigger = body?.trigger ?? "call.completed";
  const payload = body?.payload ?? {};
  const res = await runAllAgents(organizationId, trigger, payload);
  return NextResponse.json({ ran: res });
}

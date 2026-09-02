import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { computeDealRisk } from "@/lib/deal-risk";

export async function GET() {
  const { organizationId, userId } = await requireTenant();
  const since7d = new Date(Date.now()-7*86400000);
  const [deals, calls, followUps, skills, sessions, risksRaw] = await Promise.all([
    prisma.deal.findMany({ where: { organizationId, stage: { notIn: ["WON","LOST"] as never } }, include: { discoveryFields: { select: { key:true, status:true } }, company: { select:{name:true} }, _count:{ select:{ objections:true } } }, take: 100, orderBy:{ updatedAt:"desc" } }),
    prisma.call.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take: 5, select:{ id:true, title:true, scheduledAt:true, status:true, dealId:true } }),
    prisma.followUp.findMany({ where:{ organizationId, status:{ in:["DRAFT","PENDING_REVIEW"] as never } }, take:5, orderBy:{ createdAt:"desc" }, select:{ id:true, type:true, subject:true, status:true, dealId:true } }),
    prisma.sellerSkill.findMany({ where:{ userId }, orderBy:{ currentScore:"asc" }, take:3 }),
    prisma.coachingSession.findMany({ where:{ organizationId, userId }, orderBy:{createdAt:"desc"}, take:1 }),
    prisma.objection.findMany({ where:{ organizationId, category:"COMPETITION" as never }, select:{ dealId:true } }),
  ]);

  const compSet = new Set(risksRaw.map(o=>o.dealId).filter(Boolean) as string[]);
  const dealRisks = deals.map(d=>({ id:d.id, name:d.name, company:d.company?.name ?? null, stage:String(d.stage), risk: computeDealRisk({ discoveryFields:d.discoveryFields, deal:{nextStep:d.nextStep, updatedAt:d.updatedAt, stage:String(d.stage)}, objectionsCount:d._count.objections, hasCompetitorObjection: compSet.has(d.id) } as never) })).sort((a,b)=>b.risk.score-a.risk.score).slice(0,5);

  const upcomingCalls = calls.filter(c=>c.scheduledAt && new Date(c.scheduledAt) >= new Date()).slice(0,5);
  const weakest = skills.map(s=>s.skill);
  const todayTraining = weakest.length ? `Foco: ${weakest.join(", ")} — 1 Executive Discovery Roleplay sugerido` : "Sem skills ainda — faça 1 roleplay para calibrar.";

  // daily brief text
  const brief = [
    `Bom dia.`,
    upcomingCalls.length ? `Hoje: ${upcomingCalls.length} call(s) agendada(s).` : "Sem calls agendadas hoje.",
    followUps.length ? `Follow-ups pendentes: ${followUps.length}.` : "Follow-ups em dia.",
    dealRisks.length ? `Deal risco alto: ${dealRisks.filter(d=>d.risk.level==="high").map(d=>d.name).join(", ") || "nenhum"}.` : "",
    todayTraining,
  ].filter(Boolean).join(" ");

  return NextResponse.json({
    brief,
    dealRisks,
    upcomingCalls: calls.slice(0,5),
    pendingFollowUps: followUps,
    weakestSkills: weakest,
    latestCoaching: sessions[0] ?? null,
  });
}

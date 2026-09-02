import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { coachingSchemaReq } from "@/lib/validations/ai";
import { coachingSchema } from "@/lib/ai/schemas";
import { coachingPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";
import { computeHealth } from "@/lib/discovery";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => ({}));
  const parsed = coachingSchemaReq.safeParse(body ?? {});
  const periodDays = parsed.success ? parsed.data.periodDays : 30;
  const since = new Date(Date.now() - periodDays * 24 * 3600 * 1000);

  const [profile, skills, deals, insights] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId } }),
    prisma.sellerSkill.findMany({ where: { userId } }),
    prisma.deal.findMany({ where: { organizationId }, take: 100, include: { discoveryFields: { select: { key: true, status: true } } } }),
    prisma.aIInsight.findMany({ where: { organizationId, createdAt: { gte: since } }, take: 30, orderBy: { createdAt: "desc" } }),
  ]);

  const dealsBrief = deals.map((d) => ({ name: d.name, stage: d.stage, health: computeHealth(d.discoveryFields) }));
  const avgHealth = dealsBrief.length ? Math.round(dealsBrief.reduce((s, d) => s + d.health, 0) / dealsBrief.length) : 0;

  const prompt = coachingPrompt({ profile, skills, deals: dealsBrief, recentInsights: insights, avgHealth });

  const provider = getAIProvider();
  const { model } = modelForTask("coaching");
  const t0 = Date.now();

  try {
    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é AI Sales Coach. Seja direto, baseado em evidência, específico e acionável.",
      prompt,
      schema: coachingSchema,
      temperature: 0.3,
    });

    await prisma.coachingSession.create({
      data: {
        organizationId,
        userId,
        periodStart: since,
        periodEnd: new Date(),
        summary: result.summary,
        strengths: result.strengths as never,
        weaknesses: result.weaknesses as never,
        trends: result.trends as never,
      } as never,
    });

    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "CoachAgent", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await prisma.aIRecommendation.create({
      data: {
        organizationId, userId, type: "coaching", title: result.summary.slice(0, 120),
        reason: result.weaknesses.join(" · ") || null,
        payload: { recommendations: result.recommendations, trends: result.trends } as never,
      } as never,
    }).catch(() => {});
    await auditLog({ organizationId, userId, action: "coaching.generated", entityType: "CoachingSession", metadata: { periodDays } as never });

    return NextResponse.json(result);
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "CoachAgent", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const { organizationId, userId } = await requireTenant();
  const sessions = await prisma.coachingSession.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ items: sessions });
}

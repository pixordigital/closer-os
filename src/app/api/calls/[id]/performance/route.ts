import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { performanceCoachSchema } from "@/lib/ai/schemas";
import { performanceCoachPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const call = await prisma.call.findFirst({
    where: { id, organizationId },
    include: { transcript: true, deal: { include: { company: true } } },
  }) as unknown as { id:string, dealId:string|null, transcript:{content:string}|null, deal:{ company:unknown }|null };
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  if (!call.transcript?.content?.trim()) return NextResponse.json({ error: "Call sem transcript" }, { status: 400 });

  const insights = await prisma.aIInsight.findMany({ where: { callId: id, organizationId }, take: 10 });
  const skills = await prisma.sellerSkill.findMany({ where: { userId } });

  const scenarios = await prisma.roleplayScenario.findMany({
    where: { OR: [{ organizationId }, { organizationId: null }] },
    select: { id: true, title: true, difficulty: true, trainingObjective: true },
    take: 15,
  });

  const prompt = performanceCoachPrompt({
    transcript: call.transcript.content,
    deal: (call as unknown as { deal: unknown }).deal,
    company: (call.deal as unknown as { company?: unknown })?.company ?? null,
    insights,
    skills,
  });

  const provider = getAIProvider();
  const { model } = modelForTask("coaching");
  const t0 = Date.now();
  try {
    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é Performance Coach B2B direto e baseado em evidência. Analise transcript e retorne JSON no schema.",
      prompt: prompt + `\n\nCenários disponíveis para recomendar: ${JSON.stringify(scenarios).slice(0, 2000)} — prefira IDs reais quando relevante.`,
      schema: performanceCoachSchema,
      temperature: 0.3,
    });

    const withIds = {
      ...result,
      recommendedRoleplays: result.recommendedRoleplays.map(r => {
        if (r.scenarioId) return r;
        const match = scenarios.find(s => s.trainingObjective?.toLowerCase().includes(r.trainingObjective.toLowerCase().slice(0, 10)) || s.title.toLowerCase().includes(r.title.toLowerCase().slice(0, 10)));
        return { ...r, scenarioId: match?.id ?? null };
      }),
    };

    await prisma.aIInsight.create({
      data: {
        organizationId,
        dealId: (call as unknown as { dealId?: string }).dealId ?? null,
        callId: id,
        type: "coaching",
        title: `Performance: ${withIds.summary.slice(0, 120)}`,
        evidence: `Score ${withIds.overallScore} — ${withIds.strengths.length} pontos fortes, ${withIds.improvements.length} melhorias`,
        confidence: withIds.overallScore / 100,
        whyItMatters: withIds.summary,
        recommendedAction: withIds.nextSteps.join(" | ") || withIds.improvements[0]?.suggestion,
        metadata: withIds as never,
      } as never,
    });

    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "PerformanceCoach", latencyMs: Date.now() - t0, estimatedCost: estimateCost(model, null, null) });

    return NextResponse.json(withIds);
  } catch (e) {
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "PerformanceCoach", latencyMs: Date.now() - t0, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const insights = await prisma.aIInsight.findMany({
    where: { callId: id, organizationId, type: "coaching" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return NextResponse.json({ insights });
}

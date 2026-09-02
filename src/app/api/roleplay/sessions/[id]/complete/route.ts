import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { roleplayEvaluationSchema } from "@/lib/ai/roleplay-schemas";
import { evaluationPrompt } from "@/lib/ai/roleplay-prompts";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const session = await prisma.roleplaySession.findFirst({
    where: { id, organizationId, userId },
    include: { scenario: true, messages: { orderBy: { timestamp: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "ACTIVE") return NextResponse.json({ error: "Session not active" }, { status: 400 });
  if (session.messages.length < 2) return NextResponse.json({ error: "Mínimo 1 troca (seller+prospect) antes de avaliar" }, { status: 400 });

  const transcript = session.messages.map((m) => ({ speaker: m.speaker as string, content: m.content }));
  const profile = await prisma.sellerProfile.findUnique({ where: { userId } }).catch(() => null);

  const provider = getAIProvider();
  const { model } = modelForTask("coaching");
  const prompt = evaluationPrompt({ scenario: { title: session.scenario.title, persona: session.scenario.persona, publicContext: session.scenario.publicContext, hiddenContext: (session.scenario as unknown as { hiddenContext: unknown }).hiddenContext }, transcript, sellerProfile: profile });
  const t0 = Date.now();

  try {
    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é Roleplay Evaluator. Retorne JSON no schema roleplayEvaluationSchema.",
      prompt,
      schema: roleplayEvaluationSchema,
      temperature: 0.2,
    });

    const evaluation = await prisma.roleplayEvaluation.create({
      data: {
        sessionId: id,
        overallScore: result.overallScore,
        skills: result.skills as never,
        strengths: result.strengths as never,
        weaknesses: result.weaknesses as never,
        decisiveMoments: result.decisiveMoments as never,
        errorTypes: result.errorTypes as never,
        recommendedExercises: result.recommendedExercises as never,
      } as never,
    });

    await prisma.roleplaySession.update({
      where: { id },
      data: { status: "COMPLETED" as never, completedAt: new Date(), overallScore: result.overallScore } as never,
    });

    // RoleplayScore per skill
    for (const [skill, score] of Object.entries(result.skills)) {
      await prisma.roleplayScore.create({
        data: { userId, sessionId: id, skill, score: Math.round(score as number), source: "roleplay" } as never,
      }).catch(() => {});
      // upsert SellerSkill
      const existing = await prisma.sellerSkill.findUnique({ where: { userId_skill: { userId, skill } } }).catch(() => null);
      if (existing) {
        const newScore = Math.round(((existing as { currentScore: number }).currentScore * ((existing as { sampleSize: number }).sampleSize) + (score as number)) / (((existing as { sampleSize: number }).sampleSize) + 1));
        await prisma.sellerSkill.update({ where: { userId_skill: { userId, skill } }, data: { currentScore: newScore, sampleSize: { increment: 1 } } as never }).catch(() => {});
      } else {
        await prisma.sellerSkill.create({ data: { userId, skill, currentScore: Math.round(score as number), sampleSize: 1 } as never }).catch(() => {});
      }
    }

    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "RoleplayEvaluator", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await auditLog({ organizationId, userId, action: "roleplay.completed", entityType: "RoleplaySession", entityId: id, metadata: { overallScore: result.overallScore } as never });
    fireTriggers({ organizationId, event: "roleplay.completed", payload: { id, sessionId: id, scenarioId: session.scenarioId, overallScore: result.overallScore }, idempotencyKey: `roleplay.completed:${id}` });

    return NextResponse.json({ evaluation, session: { ...session, status: "COMPLETED", overallScore: result.overallScore } });
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "RoleplayEvaluator", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

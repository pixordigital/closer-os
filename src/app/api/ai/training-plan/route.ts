import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { trainingPlanSchema } from "@/lib/ai/training-schemas";
import { trainingPlannerPrompt } from "@/lib/ai/training-prompts";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";

export async function POST() {
  const { organizationId, userId } = await requireTenant();

  const [skills, recentSessions, scenarios] = await Promise.all([
    prisma.sellerSkill.findMany({ where: { userId }, orderBy: { currentScore: "asc" }, take: 6 }),
    prisma.coachingSession.findMany({ where: { organizationId, userId }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.roleplayScenario.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      select: { id: true, title: true, difficulty: true, trainingObjective: true },
      take: 20,
    }),
  ]);

  // weakest = lowest scores, or if no skills yet, fallback to generic
  const weakestSkills = skills.length
    ? skills.slice(0, 3).map((s) => ({ skill: s.skill, score: s.currentScore }))
    : [{ skill: "discovery", score: 50 }, { skill: "impactQuantification", score: 50 }, { skill: "objectionHandling", score: 50 }];

  const recentWeaknesses: string[] = [];
  for (const s of recentSessions) {
    const w = s.weaknesses as unknown as string[] | null;
    if (Array.isArray(w)) recentWeaknesses.push(...w.slice(0, 3));
  }
  const strengths: string[] = [];
  for (const s of recentSessions) {
    const v = s.strengths as unknown as string[] | null;
    if (Array.isArray(v)) strengths.push(...v.slice(0, 3));
  }

  const prompt = trainingPlannerPrompt({
    weakestSkills,
    recentWeaknesses: recentWeaknesses.slice(0, 6),
    strengths: strengths.slice(0, 6),
    availableScenarios: scenarios.map((sc) => ({ id: sc.id, title: sc.title, difficulty: String(sc.difficulty), trainingObjective: sc.trainingObjective })),
  });

  const provider = getAIProvider();
  const { model } = modelForTask("coaching");
  const t0 = Date.now();

  try {
    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é Training Planner. Retorne JSON no schema trainingPlanSchema.",
      prompt,
      schema: trainingPlanSchema,
      temperature: 0.3,
    });

    const plan = await prisma.trainingPlan.create({
      data: {
        organizationId,
        userId,
        title: result.title,
        focus: result.focus,
        goal: result.goal,
        week: result.week ?? null,
        trainingExercises: {
          create: result.exercises.map((e) => ({
            title: e.title,
            type: e.type,
            scenarioId: e.scenarioId ?? null,
          })),
        },
      } as never,
      include: { trainingExercises: true },
    });

    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "TrainingPlanner", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await auditLog({ organizationId, userId, action: "training_plan.generated", entityType: "TrainingPlan", entityId: plan.id, metadata: { focus: result.focus } as never });

    return NextResponse.json(plan, { status: 201 });
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "TrainingPlanner", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

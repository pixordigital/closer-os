import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { planCreateSchema } from "@/lib/validations/training";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const { organizationId, userId } = await requireTenant();
  const items = await prisma.trainingPlan.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    include: { trainingExercises: true },
    take: 20,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = planCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { exercises, ...rest } = parsed.data;

  const plan = await prisma.trainingPlan.create({
    data: {
      organizationId, userId,
      ...rest,
      trainingExercises: exercises?.length ? { create: exercises.map((e) => ({ title: e.title, type: e.type, scenarioId: e.scenarioId ?? null })) } : undefined,
    } as never,
    include: { trainingExercises: true },
  });
  await auditLog({ organizationId, userId, action: "training_plan.created", entityType: "TrainingPlan", entityId: plan.id });
  return NextResponse.json(plan, { status: 201 });
}

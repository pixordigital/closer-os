import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { exercisePatchSchema } from "@/lib/validations/training";
import { auditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; exerciseId: string }> }) {
  const { id, exerciseId } = await params;
  const { organizationId, userId } = await requireTenant();
  const plan = await prisma.trainingPlan.findFirst({ where: { id, organizationId, userId }, select: { id: true } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ex = await prisma.trainingExercise.findFirst({ where: { id: exerciseId, planId: id } });
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = exercisePatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await prisma.trainingExercise.update({ where: { id: exerciseId }, data: parsed.data as never });
  await auditLog({ organizationId, userId, action: "training_exercise.updated", entityType: "TrainingExercise", entityId: exerciseId, metadata: parsed.data as never });
  return NextResponse.json(updated);
}

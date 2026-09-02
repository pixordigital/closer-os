import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { planUpdateSchema } from "@/lib/validations/training";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, organizationId: string, userId: string) {
  const plan = await prisma.trainingPlan.findFirst({ where: { id, organizationId, userId }, include: { trainingExercises: true } });
  return plan;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const plan = await getScoped(id, organizationId, userId);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const plan = await getScoped(id, organizationId, userId);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { exercises, ...rest } = parsed.data as never as { exercises?: { title: string; type: string; scenarioId?: string | null }[] } & Record<string, unknown>;
  const updated = await prisma.trainingPlan.update({
    where: { id },
    data: { ...rest } as never,
    include: { trainingExercises: true },
  });
  // inline create requested exercises if present
  if (exercises?.length) {
    await prisma.trainingExercise.createMany({ data: exercises.map((e) => ({ planId: id, title: e.title, type: e.type, scenarioId: e.scenarioId ?? null })) });
  }
  await auditLog({ organizationId, userId, action: "training_plan.updated", entityType: "TrainingPlan", entityId: id });
  const fresh = await prisma.trainingPlan.findUnique({ where: { id }, include: { trainingExercises: true } });
  return NextResponse.json(updated ? fresh : updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const plan = await getScoped(id, organizationId, userId);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.trainingPlan.delete({ where: { id } });
  await auditLog({ organizationId, userId, action: "training_plan.deleted", entityType: "TrainingPlan", entityId: id });
  return NextResponse.json({ ok: true });
}

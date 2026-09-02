import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { automationPatchSchema } from "@/lib/validations/automation";
import { auditLog } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const r = await prisma.automationRule.findFirst({ where:{ id, organizationId }, include:{ runs:{ take:10, orderBy:{createdAt:"desc"} } } });
  if (!r) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json(r);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const rule = await prisma.automationRule.findFirst({ where:{ id, organizationId } });
  if (!rule) return NextResponse.json({ error:"Not found" }, { status:404 });
  const body = await req.json().catch(()=>null);
  const parsed = automationPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const data: Record<string,unknown> = {};
  if (parsed.data.trigger !== undefined) data.trigger = parsed.data.trigger;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.conditions !== undefined) data.conditions = parsed.data.conditions;
  if (parsed.data.actions !== undefined) data.actions = parsed.data.actions;
  const updated = await prisma.automationRule.update({ where:{ id }, data: data as never });
  await auditLog({ organizationId, userId, action:"automation.updated", entityType:"AutomationRule", entityId:id });
  return NextResponse.json(updated);
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const rule = await prisma.automationRule.findFirst({ where:{ id, organizationId } });
  if (!rule) return NextResponse.json({ error:"Not found" }, { status:404 });
  await prisma.automationRule.delete({ where:{ id } });
  await auditLog({ organizationId, userId, action:"automation.deleted", entityType:"AutomationRule", entityId:id });
  return NextResponse.json({ ok:true });
}

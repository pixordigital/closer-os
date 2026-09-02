import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { automationCreateSchema } from "@/lib/validations/automation";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const { organizationId } = await requireTenant();
  const items = await prisma.automationRule.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, include:{ _count:{ select:{ runs:true } } } });
  return NextResponse.json({ items });
}
export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = automationCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const rule = await prisma.automationRule.create({ data:{ organizationId, trigger: parsed.data.trigger, enabled: parsed.data.enabled ?? true, conditions: (parsed.data.conditions ?? null) as never, actions: parsed.data.actions as never } as never });
  await auditLog({ organizationId, userId, action:"automation.created", entityType:"AutomationRule", entityId: rule.id, metadata:{ trigger: rule.trigger } as never });
  return NextResponse.json(rule, { status:201 });
}

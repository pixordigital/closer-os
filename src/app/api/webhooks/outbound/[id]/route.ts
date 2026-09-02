import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { endpointPatchSchema } from "@/lib/validations/webhook";
import { auditLog } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId }, include: { deliveries: { take: 10, orderBy:{createdAt:"desc"} } } });
  if (!ep) return NextResponse.json({ error:"Not found" }, { status:404 });
  const { secret, ...rest } = ep;
  return NextResponse.json({ ...rest, secretMasked: secret.slice(0,4)+"****" });
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const ep = await prisma.webhookEndpoint.findFirst({ where:{ id, organizationId } });
  if (!ep) return NextResponse.json({ error:"Not found" }, { status:404 });
  const body = await req.json().catch(()=>null);
  const parsed = endpointPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:parsed.error.flatten() }, { status:400 });
  const updated = await prisma.webhookEndpoint.update({ where:{ id }, data: parsed.data as never });
  await auditLog({ organizationId, userId, action:"webhook.updated", entityType:"WebhookEndpoint", entityId:id });
  return NextResponse.json({ ...updated, secretMasked: updated.secret.slice(0,4)+"****" });
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const ep = await prisma.webhookEndpoint.findFirst({ where:{ id, organizationId } });
  if (!ep) return NextResponse.json({ error:"Not found" }, { status:404 });
  await prisma.webhookEndpoint.delete({ where:{ id } });
  await auditLog({ organizationId, userId, action:"webhook.deleted", entityType:"WebhookEndpoint", entityId:id });
  return NextResponse.json({ ok:true });
}

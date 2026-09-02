import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { integrationPatchSchema } from "@/lib/validations/integration";
import { auditLog } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const row = await prisma.integrationConnection.findFirst({ where: { id, organizationId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = integrationPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.integrationConnection.findFirst({ where: { id, organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.integrationConnection.update({ where: { id }, data: { ...(parsed.data.config !== undefined ? { config: parsed.data.config as never } : {}), ...(parsed.data.status ? { status: parsed.data.status } : {}) } as never });
  await auditLog({ organizationId, userId, action: "integration.updated", entityType: "IntegrationConnection", entityId: id });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const row = await prisma.integrationConnection.findFirst({ where: { id, organizationId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.integrationConnection.delete({ where: { id } });
  await auditLog({ organizationId, userId, action: "integration.disconnected", entityType: "IntegrationConnection", entityId: id, metadata: { provider: row.provider } as never });
  return NextResponse.json({ ok: true });
}

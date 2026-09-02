import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { integrationCreateSchema } from "@/lib/validations/integration";
import { auditLog } from "@/lib/audit";
import { getIntegration } from "@/lib/integrations/registry";

export async function GET() {
  const { organizationId } = await requireTenant();
  const items = await prisma.integrationConnection.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = integrationCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const kind = parsed.data.kind ?? getIntegration(parsed.data.provider).kind;
  const row = await prisma.integrationConnection.create({
    data: { organizationId, provider: parsed.data.provider, kind, config: parsed.data.config as never, status: "connected" } as never,
  });
  await auditLog({ organizationId, userId, action: "integration.connected", entityType: "IntegrationConnection", entityId: row.id, metadata: { provider: row.provider } as never });
  return NextResponse.json(row, { status: 201 });
}

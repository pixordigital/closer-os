import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { endpointCreateSchema } from "@/lib/validations/webhook";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const { organizationId } = await requireTenant();
  const items = await prisma.webhookEndpoint.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { deliveries: true } } } });
  const sanitized = items.map(({ secret, ...rest }) => ({ ...rest, secretMasked: secret.slice(0,4)+"****" }));
  return NextResponse.json({ items: sanitized });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = endpointCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const ep = await prisma.webhookEndpoint.create({ data: { organizationId, ...parsed.data } as never });
  await auditLog({ organizationId, userId, action: "webhook.created", entityType: "WebhookEndpoint", entityId: ep.id, metadata: { url: ep.url } as never });
  return NextResponse.json({ ...ep, secretMasked: ep.secret.slice(0,4)+"****" }, { status: 201 });
}

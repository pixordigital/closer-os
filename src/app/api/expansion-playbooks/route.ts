// @ts-nocheck
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  companyId: z.string().cuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  trigger: z.enum(["USAGE_SPIKE", "NEW_STAKEHOLDER", "RENEWAL_APPROACHING", "FEATURE_GAP", "COMPETITOR_MENTION", "NPS_HIGH", "MANUAL"]),
  conditions: z.array(z.object({
    field: z.string(),
    op: z.string(),
    value: z.any(),
  })).optional(),
  steps: z.array(z.object({
    action: z.string(),
    templateId: z.string().optional(),
    delayDays: z.number().int().min(0),
    ownerRole: z.enum(["OWNER", "CSM", "AE", "SE", "MANAGER"]).optional(),
  })).optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const isActive = url.searchParams.get("active");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: any = { organizationId };
  if (companyId) where.companyId = companyId;
  if (isActive !== null) where.isActive = isActive === "true";

  const [playbooks, total] = await Promise.all([
    prisma.expansionPlaybook.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: { Company: { select: { id: true, name: true } } },
    }),
    prisma.expansionPlaybook.count({ where }),
  ]);

  return NextResponse.json({ playbooks, total, limit, offset });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.companyId) {
    const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, organizationId } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const playbook = await prisma.expansionPlaybook.create({
    data: {
      organizationId,
      companyId: parsed.data.companyId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      conditions: parsed.data.conditions as never,
      steps: parsed.data.steps as never,
      isActive: parsed.data.isActive,
    } as never,
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "expansion_playbook.created", entityType: "ExpansionPlaybook", entityId: playbook.id, metadata: parsed.data },
  });

  return NextResponse.json({ playbook });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.expansionPlaybook.update({ where: { id, organizationId }, data: parsed.data });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "expansion_playbook.updated", entityType: "ExpansionPlaybook", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.expansionPlaybook.delete({ where: { id, organizationId } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "expansion_playbook.deleted", entityType: "ExpansionPlaybook", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
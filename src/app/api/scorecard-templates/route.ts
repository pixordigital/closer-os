import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  criteria: z.array(z.object({
    skill: z.string(),
    weight: z.number().min(0).max(100),
    description: z.string().optional(),
    minScore: z.number().min(0).max(100).default(70),
  })).min(1),
  isDefault: z.boolean().default(false),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const templates = await prisma.scorecardTemplate.findMany({
    where: { organizationId },
    orderBy: { isDefault: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.scorecardTemplate.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.scorecardTemplate.create({
    data: { ...parsed.data, organizationId },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "scorecard_template.created", entityType: "ScorecardTemplate", entityId: template.id, metadata: parsed.data },
  });

  return NextResponse.json({ template });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.scorecardTemplate.updateMany({
      where: { organizationId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  await prisma.scorecardTemplate.update({ where: { id, organizationId }, data: parsed.data });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "scorecard_template.updated", entityType: "ScorecardTemplate", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.scorecardTemplate.delete({ where: { id, organizationId } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "scorecard_template.deleted", entityType: "ScorecardTemplate", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
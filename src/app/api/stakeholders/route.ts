import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  dealId: z.string().cuid(),
  contactId: z.string().cuid().optional(),
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(["CHAMPION", "ECONOMIC_BUYER", "TECHNICAL_BUYER", "USER_BUYER", "INFLUENCER", "BLOCKER", "LEGAL_PROCUREMENT", "EXECUTIVE_SPONSOR"]),
  influence: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "UNKNOWN"]).default("UNKNOWN"),
  isChampion: z.boolean().default(false),
  isDecisionMaker: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  lastEngagement: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const stakeholders = await prisma.stakeholder.findMany({
    where: { organizationId, dealId },
    orderBy: [{ influence: "desc" }, { role: "asc" }],
    include: { contact: { select: { id: true, name: true, email: true, phone: true, decisionRole: true } } },
  });

  return NextResponse.json({ stakeholders });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  // If setting as champion, unset others
  if (parsed.data.isChampion) {
    await prisma.stakeholder.updateMany({
      where: { dealId: parsed.data.dealId, isChampion: true },
      data: { isChampion: false },
    });
  }

  const stakeholder = await prisma.stakeholder.create({
    data: { ...parsed.data, organizationId, lastEngagement: parsed.data.lastEngagement ? new Date(parsed.data.lastEngagement) : null },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "stakeholder.created", entityType: "Stakeholder", entityId: stakeholder.id, metadata: parsed.data },
  });

  return NextResponse.json({ stakeholder });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const stakeholder = await prisma.stakeholder.findFirst({ where: { id, organizationId } });
  if (!stakeholder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.isChampion) {
    await prisma.stakeholder.updateMany({
      where: { dealId: stakeholder.dealId, isChampion: true, id: { not: id } },
      data: { isChampion: false },
    });
  }

  const updated = await prisma.stakeholder.update({
    where: { id },
    data: { ...parsed.data, lastEngagement: parsed.data.lastEngagement ? new Date(parsed.data.lastEngagement) : undefined },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "stakeholder.updated", entityType: "Stakeholder", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ stakeholder: updated });
}

export async function DELETE(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.stakeholder.delete({ where: { id, organizationId } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "stakeholder.deleted", entityType: "Stakeholder", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
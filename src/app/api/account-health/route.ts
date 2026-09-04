// @ts-nocheck
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  companyId: z.string().cuid(),
  overallScore: z.number().int().min(0).max(100),
  tier: z.enum(["HEALTHY", "AT_RISK", "CRITICAL", "CHURNED"]).optional(),
  adoptionScore: z.number().int().min(0).max(100).optional().nullable(),
  engagementScore: z.number().int().min(0).max(100).optional().nullable(),
  supportScore: z.number().int().min(0).max(100).optional().nullable(),
  npsScore: z.number().int().min(-100).max(100).optional().nullable(),
  lastLoginDays: z.number().int().min(0).optional().nullable(),
  lastTouchDays: z.number().int().min(0).optional().nullable(),
  openTickets: z.number().int().min(0).optional().nullable(),
  churnRisk: z.number().min(0).max(1).optional().nullable(),
  expansionPotential: z.number().min(0).max(1).optional().nullable(),
  signals: z.record(z.any()).default({}),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const tier = url.searchParams.get("tier");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: any = { organizationId };
  if (companyId) where.companyId = companyId;
  if (tier) where.tier = tier;

  const [healthRecords, total] = await Promise.all([
    prisma.accountHealth.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: { company: { select: { id: true, name: true, website: true } } },
    }),
    prisma.accountHealth.count({ where }),
  ]);

  return NextResponse.json({ healthRecords, total, limit, offset });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, organizationId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const tier = parsed.data.tier ?? (parsed.data.overallScore >= 70 ? "HEALTHY" : parsed.data.overallScore >= 40 ? "AT_RISK" : parsed.data.overallScore >= 15 ? "CRITICAL" : "CHURNED");

  const health = await prisma.accountHealth.upsert({
    where: { organizationId_companyId: { organizationId, companyId: parsed.data.companyId } },
    update: {
      overallScore: parsed.data.overallScore,
      tier,
      adoptionScore: parsed.data.adoptionScore,
      engagementScore: parsed.data.engagementScore,
      supportScore: parsed.data.supportScore,
      npsScore: parsed.data.npsScore,
      lastLoginDays: parsed.data.lastLoginDays,
      lastTouchDays: parsed.data.lastTouchDays,
      openTickets: parsed.data.openTickets,
      churnRisk: parsed.data.churnRisk,
      expansionPotential: parsed.data.expansionPotential,
      signals: parsed.data.signals,
      notes: parsed.data.notes,
      calculatedAt: new Date(),
    },
    create: {
      organizationId,
      companyId: parsed.data.companyId,
      overallScore: parsed.data.overallScore,
      tier,
      adoptionScore: parsed.data.adoptionScore,
      engagementScore: parsed.data.engagementScore,
      supportScore: parsed.data.supportScore,
      npsScore: parsed.data.npsScore,
      lastLoginDays: parsed.data.lastLoginDays,
      lastTouchDays: parsed.data.lastTouchDays,
      openTickets: parsed.data.openTickets,
      churnRisk: parsed.data.churnRisk,
      expansionPotential: parsed.data.expansionPotential,
      signals: parsed.data.signals,
      notes: parsed.data.notes,
    },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "account_health.upserted", entityType: "AccountHealth", entityId: health.id, metadata: parsed.data },
  });

  return NextResponse.json({ health });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const health = await prisma.accountHealth.findFirst({ where: { id, organizationId } });
  if (!health) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tier = parsed.data.tier ?? (parsed.data.overallScore !== undefined
    ? (parsed.data.overallScore >= 70 ? "HEALTHY" : parsed.data.overallScore >= 40 ? "AT_RISK" : parsed.data.overallScore >= 15 ? "CRITICAL" : "CHURNED")
    : undefined);

  await prisma.accountHealth.update({
    where: { id },
    data: {
      overallScore: parsed.data.overallScore,
      tier,
      adoptionScore: parsed.data.adoptionScore,
      engagementScore: parsed.data.engagementScore,
      supportScore: parsed.data.supportScore,
      npsScore: parsed.data.npsScore,
      lastLoginDays: parsed.data.lastLoginDays,
      lastTouchDays: parsed.data.lastTouchDays,
      openTickets: parsed.data.openTickets,
      churnRisk: parsed.data.churnRisk,
      expansionPotential: parsed.data.expansionPotential,
      signals: parsed.data.signals,
      notes: parsed.data.notes,
      calculatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "account_health.updated", entityType: "AccountHealth", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
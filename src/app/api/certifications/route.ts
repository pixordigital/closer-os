import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  userId: z.string().cuid(),
  templateId: z.string().cuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "PASSED", "FAILED", "EXPIRED"]).default("NOT_STARTED"),
  score: z.number().int().min(0).max(100).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") ?? userId;
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: any = { organizationId, userId: targetUserId };
  if (status) where.status = status;

  const [certifications, total] = await Promise.all([
    prisma.certification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { template: { select: { id: true, name: true } } },
    }),
    prisma.certification.count({ where }),
  ]);

  return NextResponse.json({ certifications, total, limit, offset });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const targetUser = await prisma.user.findFirst({ where: { id: parsed.data.userId, memberships: { some: { organizationId } } } });
  if (!targetUser) return NextResponse.json({ error: "User not found in org" }, { status: 404 });

  if (parsed.data.templateId) {
    const template = await prisma.scorecardTemplate.findFirst({ where: { id: parsed.data.templateId, organizationId } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const certification = await prisma.certification.create({
    data: { ...parsed.data, organizationId, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "certification.created", entityType: "Certification", entityId: certification.id, metadata: parsed.data },
  });

  return NextResponse.json({ certification });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cert = await prisma.certification.findFirst({ where: { id, organizationId } });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.certification.update({
    where: { id },
    data: { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "certification.updated", entityType: "Certification", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  callId: z.string().cuid(),
  title: z.string().min(1),
  startTime: z.number().int().min(0),
  endTime: z.number().int().min(1),
  transcript: z.string().min(1),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  const tags = url.searchParams.get("tags")?.split(",").filter(Boolean);
  const isPublic = url.searchParams.get("public") === "true";
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: any = { organizationId };
  if (callId) where.callId = callId;
  if (tags?.length) where.tags = { hasSome: tags };
  if (isPublic) where.isPublic = true;
  else where.OR = [{ isPublic: true }, { userId }];

  const [clips, total] = await Promise.all([
    prisma.callClip.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset, include: { call: { select: { id: true, title: true, scheduledAt: true } } } }),
    prisma.callClip.count({ where }),
  ]);

  return NextResponse.json({ clips, total, limit, offset });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const call = await prisma.call.findFirst({ where: { id: parsed.data.callId, organizationId } });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const clip = await prisma.callClip.create({
    data: { ...parsed.data, organizationId, userId },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "call_clip.created", entityType: "CallClip", entityId: clip.id, metadata: { callId: parsed.data.callId, title: parsed.data.title } },
  });

  return NextResponse.json({ clip });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const clip = await prisma.callClip.findFirst({ where: { id, organizationId } });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (clip.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.callClip.update({ where: { id }, data: parsed.data });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "call_clip.updated", entityType: "CallClip", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const clip = await prisma.callClip.findFirst({ where: { id, organizationId } });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (clip.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.callClip.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "call_clip.deleted", entityType: "CallClip", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  dealId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  ownerEmail: z.string().email().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "CANCELLED"]).default("NOT_STARTED"),
  order: z.number().int().default(0),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const items = await prisma.mAPItem.findMany({
    where: { organizationId, dealId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const item = await prisma.mAPItem.create({
    data: { ...parsed.data, organizationId, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "map_item.created", entityType: "MAPItem", entityId: item.id, metadata: parsed.data },
  });

  return NextResponse.json({ item });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.mAPItem.update({ where: { id, organizationId }, data: { ...parsed.data, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "map_item.updated", entityType: "MAPItem", entityId: id, metadata: parsed.data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.mAPItem.delete({ where: { id, organizationId } });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "map_item.deleted", entityType: "MAPItem", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
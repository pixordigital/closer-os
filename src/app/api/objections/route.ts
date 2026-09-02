import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";

const createSchema = z.object({
  dealId: z.string().cuid().optional().nullable(),
  callId: z.string().cuid().optional().nullable(),
  category: z.enum(["PRICE","TIMING","AUTHORITY","TRUST","COMPETITION","STATUS_QUO","NEED","PRIORITY","IMPLEMENTATION","RISK","INTERNAL_APPROVAL"]),
  content: z.string().min(3).max(2000),
  handled: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const where: Record<string, unknown> = {
    organizationId,
    ...(category ? { category } : {}),
    ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
  };
  const [items, total, byCat] = await Promise.all([
    prisma.objection.findMany({ where: where as never, orderBy: { createdAt: "desc" }, take: 100, include: { deal: { select: { id: true, name: true } }, call: { select: { id: true, title: true } } } }),
    prisma.objection.count({ where: where as never }),
    prisma.objection.groupBy({ by: ["category"], where: { organizationId } as never, _count: { category: true } }),
  ]);
  const dashboard = byCat.map(b => ({ category: b.category, count: b._count.category })).sort((a,b)=>b.count-a.count);
  return NextResponse.json({ items, total, dashboard });
}

export async function POST(req: Request) {
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  if (data.dealId) {
    const d = await prisma.deal.findFirst({ where: { id: data.dealId, organizationId } });
    if (!d) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  if (data.callId) {
    const c = await prisma.call.findFirst({ where: { id: data.callId, organizationId } });
    if (!c) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  const obj = await prisma.objection.create({ data: { organizationId, ...data } as never });
  return NextResponse.json(obj, { status: 201 });
}

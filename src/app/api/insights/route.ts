import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url);
  const callId = url.searchParams.get("callId")?.trim() || undefined;
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const type = url.searchParams.get("type")?.trim() || undefined;
  const where: Record<string, unknown> = {
    organizationId,
    ...(callId ? { callId } : {}),
    ...(dealId ? { dealId } : {}),
    ...(type ? { type } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.aIInsight.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.aIInsight.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

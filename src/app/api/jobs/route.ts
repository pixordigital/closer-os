import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { enqueueJob, runOneJob } from "@/lib/jobs";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url);
  const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
  const where: Record<string,unknown> = { ...(organizationId ? { organizationId } : {}), ...(status?{status}:{}) };
  const [items,total]=await Promise.all([
    prisma.aIJob.findMany({ where: where as never, orderBy:{createdAt:"desc"}, skip, take:limit }),
    prisma.aIJob.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

const createSchema = z.object({ type: z.string().min(2).max(80), payload: z.record(z.string(), z.unknown()).default({}), runAt: z.string().optional().nullable().transform(v=>v?new Date(v):null) });

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const job = await enqueueJob({ organizationId, type: parsed.data.type as never, payload: parsed.data.payload, runAt: parsed.data.runAt ?? undefined });
  await auditLog({ organizationId, userId, action:"job.enqueued", entityType:"AIJob", entityId:job.id, metadata:{ type: parsed.data.type } as never });
  return NextResponse.json(job, { status:201 });
}

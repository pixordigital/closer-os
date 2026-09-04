import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { taskCreateSchema, taskStatusEnum } from "@/lib/validations/crm";
import type { Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const parsedStatus = taskStatusEnum.safeParse(url.searchParams.get("status")?.trim().toUpperCase() ?? "");
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const due = url.searchParams.get("due")?.trim().toLowerCase();
  const dueFilter: Prisma.TaskWhereInput = {};
  if (due === "overdue") {
    const start = new Date(); start.setHours(0,0,0,0);
    dueFilter.dueDate = { lt: start };
    dueFilter.status = { in: ["TODO","IN_PROGRESS"] };
  } else if (due === "today") {
    const s = new Date(); s.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999);
    dueFilter.dueDate = { gte: s, lte: e };
  }
  const where: Prisma.TaskWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...dueFilter,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { deal: { select: { id: true, name: true } } },
    }),
    prisma.task.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal not found in organization" }, { status: 404 });
  }
  if(parsed.data.assigneeId){
    const mem=await prisma.membership.findFirst({ where:{ userId: parsed.data.assigneeId, organizationId }});
    if(!mem) return NextResponse.json({ error:"Assignee não pertence à organização" }, { status:400 });
  }
  const task = await prisma.task.create({ data: { organizationId, ...parsed.data } as never });
  await auditLog({ organizationId, userId, action: "task.created", entityType: "Task", entityId: task.id });
  if (parsed.data.dueDate) {
    try {
      const conn = await prisma.integrationConnection.findFirst({ where: { organizationId, provider: "google-calendar", status: "connected" } });
      if (conn) {
        const { GoogleCalendarProvider } = await import("@/lib/integrations/providers/googleCalendar");
        const p = new GoogleCalendarProvider();
        const start = new Date(parsed.data.dueDate);
        const end = new Date(start.getTime() + 30 * 60000);
        await p.createEvent(conn.config as never, { summary: parsed.data.title, description: parsed.data.description ?? undefined, start: start.toISOString(), end: end.toISOString() }).catch(() => {});
      }
    } catch {}
  }
  return NextResponse.json(task, { status: 201 });
}

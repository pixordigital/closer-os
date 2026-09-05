import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { cfgFor } from "@/lib/whatsapp/antiban";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? 7) || 7));
  const since = new Date(Date.now() - days * 86400000);

  const [logs, pending, conns] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId, createdAt: { gte: since }, action: { in: ["whatsapp.sent", "whatsapp.inbound", "whatsapp.optout", "whatsapp.bulk_queued", "whatsapp.reminder_sent"] } },
      select: { action: true, createdAt: true, entityId: true, metadata: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
    prisma.aIJob.count({ where: { organizationId, status: "PENDING" as never, type: { in: ["whatsapp_send", "whatsapp_reminder_d1"] as never } } }),
    prisma.integrationConnection.findMany({ where: { organizationId, kind: "whatsapp" }, select: { id: true, status: true, createdAt: true, config: true } }),
  ]);

  // byDay
  const byDay: Record<string, { sent: number; inbound: number; optout: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    byDay[d] = { sent: 0, inbound: 0, optout: 0 };
  }
  for (const l of logs as Array<{ action: string; createdAt: Date }>) {
    const d = new Date(l.createdAt).toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { sent: 0, inbound: 0, optout: 0 };
    if (l.action === "whatsapp.sent" || l.action === "whatsapp.reminder_sent") byDay[d].sent++;
    else if (l.action === "whatsapp.inbound") byDay[d].inbound++;
    else if (l.action === "whatsapp.optout") byDay[d].optout++;
  }
  const byDayArr = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));

  // byInstance
  const byInstance = await Promise.all(
    conns.map(async (c) => {
      const cfg = cfgFor(c.createdAt as Date);
      const hourAgo = new Date(Date.now() - 3600000);
      const dayAgo = new Date(Date.now() - 86400000);
      const [cHour, cDay] = await Promise.all([
        prisma.auditLog.count({ where: { organizationId, action: "whatsapp.sent", entityId: c.id, createdAt: { gte: hourAgo } } }).catch(() => 0),
        prisma.auditLog.count({ where: { organizationId, action: "whatsapp.sent", entityId: c.id, createdAt: { gte: dayAgo } } }).catch(() => 0),
      ]);
      const ageDays = (Date.now() - new Date(c.createdAt as unknown as string).getTime()) / 86400000;
      const warmupPct = Math.min(100, Math.round((ageDays / cfg.warmupDays) * 100));
      return {
        instance: c.id,
        status: c.status,
        ageDays: Math.floor(ageDays * 10) / 10,
        warmupPct,
        maxPerMinute: cfg.maxPerMinute,
        maxPerHour: cfg.maxPerHour,
        maxPerDay: cfg.maxPerDay,
        sentHour: cHour,
        sentDay: cDay,
        health: c.status === "connected" && cHour < cfg.maxPerHour * 0.8 ? "healthy" : c.status !== "connected" ? "offline" : "throttled",
      };
    })
  );

  const totalSent = (logs as Array<{ action: string }>).filter((l) => l.action === "whatsapp.sent" || l.action === "whatsapp.reminder_sent").length;
  const totalInbound = (logs as Array<{ action: string }>).filter((l) => l.action === "whatsapp.inbound").length;
  const totalOptout = (logs as Array<{ action: string }>).filter((l) => l.action === "whatsapp.optout").length;

  return NextResponse.json({ days, pendingJobs: pending, totalSent, totalInbound, totalOptout, byDay: byDayArr, byInstance });
}

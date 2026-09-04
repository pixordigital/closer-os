import { prisma } from "./db";
import { logger } from "./logger";

// §84 DB-backed job queue + worker — no Redis required

export type JobType =
  | "analyze_transcript"
  | "generate_followup"
  | "evaluate_roleplay"
  | "enrich_company"
  | "weekly_coaching_rollup"
  | "webhook_retry"
  | "daily_digest";

export async function enqueueJob(params: {
  organizationId?: string | null;
  type: JobType;
  payload: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}) {
  const job = await prisma.aIJob.create({
    data: {
      organizationId: params.organizationId ?? null,
      type: params.type,
      status: "PENDING" as never,
      payload: params.payload as never,
      runAt: params.runAt ?? null,
      maxAttempts: params.maxAttempts ?? 3,
    } as never,
  });
  logger.info({ msg: "job enqueued", event: "job.enqueued", type: params.type, organizationId: params.organizationId ?? undefined } as never);
  return job;
}

export async function claimNextJob(): Promise<{ id: string; type: string; payload: Record<string, unknown>; attempts: number } | null> {
  // SKIP LOCKED via raw query to avoid race
  const rows = await prisma.$queryRaw<Array<{ id: string; type: string; payload: unknown; attempts: number }>>`
    SELECT id, type, payload, attempts FROM "AIJob"
    WHERE status = 'PENDING' AND ("runAt" IS NULL OR "runAt" <= NOW())
    ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
  `;
  if (rows.length === 0) return null;
  const j = rows[0];
  await prisma.aIJob.update({ where: { id: j.id }, data: { status: "RUNNING" as never, startedAt: new Date(), attempts: { increment: 1 } as never } as never });
  return { id: j.id, type: j.type, payload: j.payload as Record<string, unknown>, attempts: j.attempts + 1 };
}

export async function completeJob(id: string, result: unknown) {
  await prisma.aIJob.update({ where: { id }, data: { status: "COMPLETED" as never, result: result as never, completedAt: new Date() } as never });
  logger.info({ msg: "job completed", event: "job.completed", jobId: id } as never);
}

export async function failJob(id: string, error: string) {
  const job = await prisma.aIJob.findUnique({ where: { id }, select: { attempts: true, maxAttempts: true } });
  if (!job) return;
  const shouldRetry = job.attempts < job.maxAttempts;
  await prisma.aIJob.update({
    where: { id },
    data: shouldRetry
      ? { status: "PENDING" as never, error, runAt: new Date(Date.now() + Math.min(60000 * Math.pow(2, job.attempts), 600000)) }
      : { status: "FAILED" as never, error, completedAt: new Date() },
  } as never);
  logger.warn({ msg: shouldRetry ? "job will retry" : "job failed", event: "job.failed", jobId: id, err: error.slice(0, 500) } as never);
}

// inline handlers for MVP — called by /api/jobs/run or cron
const handlers: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
  analyze_transcript: async (p) => ({ note: "use POST /api/calls/:id/analyze; job stub", callId: p.callId }),
  generate_followup: async (p) => ({ note: "use POST /api/ai/follow-up; job stub", callId: p.callId }),
  evaluate_roleplay: async (p) => ({ note: "use POST /api/roleplay/sessions/:id/complete; job stub", sessionId: p.sessionId }),
  enrich_company: async (p) => ({ note: "ResearchProvider future", companyId: p.companyId }),
  weekly_coaching_rollup: async () => ({ note: "weekly rollup future" }),
  webhook_retry: async (p) => ({ note: "webhook retry future", deliveryId: p.deliveryId }),
  daily_digest: async (p) => {
    const orgId = p.organizationId as string | undefined;
    if(!orgId) throw new Error("organizationId required");
    const { buildDigest, next08h } = await import("./digest");
    const { getIntegration } = await import("./integrations/registry");
    const d = await buildDigest(orgId);
    // try email via org email integration, else log via recommendation
    try{
      const conn = await prisma.integrationConnection.findFirst({ where:{ organizationId: orgId, kind:"email", status:"connected" }});
      const providerName = conn?.provider ?? "mock-email";
      const cfg = (conn?.config as Record<string,unknown>) ?? {};
      const prov = getIntegration(providerName);
      // need recipient: org owner email
      const owner = await prisma.membership.findFirst({ where:{ organizationId: orgId, role:"OWNER" }, include:{ user:true }});
      const to = owner?.user.email ?? (p.to as string | undefined);
      if(to && prov.sendEmail){
        await prov.sendEmail(cfg, { to, subject:`Closer OS — Digest ${new Date().toLocaleDateString("pt-BR")}`, html: d.html });
      } else {
        await prisma.aIRecommendation.create({ data:{ organizationId: orgId, type:"daily_digest", title:`Digest ${new Date().toLocaleDateString("pt-BR")}`, reason: d.text.slice(0,500), payload: d as never } as never });
      }
    }catch(e){
      await prisma.aIRecommendation.create({ data:{ organizationId: orgId, type:"daily_digest", title:`Digest ${new Date().toLocaleDateString("pt-BR")} (fallback)`, reason: String(e).slice(0,500), payload: d as never } as never });
    }
    // schedule next 08h
    const { enqueueJob: eq } = await import("./jobs");
    await eq({ organizationId: orgId, type:"daily_digest" as never, payload:{ organizationId: orgId }, runAt: next08h() });
    return d.counts;
  },
};

export async function runOneJob(): Promise<{ id: string; ok: boolean } | null> {
  const claimed = await claimNextJob();
  if (!claimed) return null;
  const h = handlers[claimed.type];
  if (!h) { await failJob(claimed.id, `No handler for type ${claimed.type}`); return { id: claimed.id, ok: false }; }
  try {
    const result = await h(claimed.payload);
    await completeJob(claimed.id, result);
    return { id: claimed.id, ok: true };
  } catch (e) {
    await failJob(claimed.id, String(e));
    return { id: claimed.id, ok: false };
  }
}

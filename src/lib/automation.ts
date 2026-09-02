import { prisma } from "./db";
import { logger } from "./logger";
import { enqueueJob } from "./jobs";

// §84 Internal Automation Engine — TRIGGER → CONDITIONS → ACTION (minimal, not Zapier)
// MVP: 6 action types, shallow condition eval, fire after auditLog.

export const AUTOMATION_TRIGGERS = [
  "call.completed",
  "call.created",
  "deal.created",
  "deal.updated",
  "roleplay.completed",
  "followup.approved",
] as const;
export type AutomationTrigger = typeof AUTOMATION_TRIGGERS[number];

export type AutomationAction =
  | { type: "analyze_transcript"; params?: Record<string, unknown> }
  | { type: "generate_insights"; params?: Record<string, unknown> }
  | { type: "generate_followup"; params?: Record<string, unknown> }
  | { type: "create_task"; params: { title: string; dealId?: string } }
  | { type: "recommend_roleplay"; params?: Record<string, unknown> }
  | { type: "enqueue_job"; params: { jobType: string; payload?: Record<string, unknown> } };

function evalConditions(conditions: Array<{ field: string; op: string; value: unknown }> | null, payload: Record<string, unknown>): boolean {
  if (!conditions?.length) return true;
  for (const c of conditions) {
    const v = payload[c.field];
    if (c.op === "eq" && v !== c.value) return false;
    if (c.op === "ne" && v === c.value) return false;
    if (c.op === "exists" && (v == null || v === "")) return false;
    if (c.op === "contains" && typeof v === "string" && typeof c.value === "string" && !v.includes(c.value)) return false;
  }
  return true;
}

async function runAction(action: AutomationAction, ctx: { organizationId: string; payload: Record<string, unknown> }) {
  const callId = (ctx.payload.callId ?? ctx.payload.id) as string | undefined;
  const dealId = (ctx.payload.dealId ?? ctx.payload.id) as string | undefined;

  switch (action.type) {
    case "analyze_transcript": {
      if (!callId) return { skipped: "no callId" };
      await enqueueJob({ organizationId: ctx.organizationId, type: "analyze_transcript", payload: { callId } });
      return { enqueued: "analyze_transcript" as const, callId };
    }
    case "generate_followup": {
      if (!callId) return { skipped: "no callId" };
      await enqueueJob({ organizationId: ctx.organizationId, type: "generate_followup", payload: { callId, dealId } });
      return { enqueued: "generate_followup" as const };
    }
    case "generate_insights":
      // alias to analyze_transcript in MVP
      if (!callId) return { skipped: "no callId" };
      await enqueueJob({ organizationId: ctx.organizationId, type: "analyze_transcript", payload: { callId } });
      return { enqueued: "analyze_transcript" as const };
    case "create_task": {
      await prisma.task.create({
        data: {
          organizationId: ctx.organizationId,
          dealId: action.params.dealId ?? dealId ?? null,
          title: action.params.title,
        } as never,
      });
      return { created: "task" as const, title: action.params.title };
    }
    case "recommend_roleplay": {
      // create AIRecommendation to surface on /coaching or /command — low-cost
      await prisma.aIRecommendation.create({
        data: {
          organizationId: ctx.organizationId,
          type: "roleplay",
          title: "Roleplay recomendado — gerado por automação",
          reason: `Trigger ${ctx.payload._trigger ?? ""}`,
          payload: ctx.payload as never,
        } as never,
      });
      return { created: "recommendation" as const };
    }
    case "enqueue_job": {
      await enqueueJob({ organizationId: ctx.organizationId, type: action.params.jobType as never, payload: action.params.payload ?? ctx.payload });
      return { enqueued: action.params.jobType };
    }
    default:
      return { skipped: `unknown action ${(action as {type:string}).type}` };
  }
}

export async function runAutomations(params: {
  organizationId: string;
  trigger: string;
  payload: Record<string, unknown>;
}) {
  const rules = await prisma.automationRule.findMany({
    where: { organizationId: params.organizationId, trigger: params.trigger, enabled: true },
  });
  if (rules.length === 0) return [];

  const results: unknown[] = [];
  for (const rule of rules) {
    const payloadWithTrigger = { ...params.payload, _trigger: params.trigger };
    const conds = (rule.conditions as Array<{ field: string; op: string; value: unknown }> | null) ?? null;
    if (!evalConditions(conds, payloadWithTrigger)) {
      await prisma.automationRun.create({ data: { ruleId: rule.id, organizationId: params.organizationId, triggerEvent: params.trigger, triggerPayload: params.payload as never, status: "success", result: { skipped: "conditions false" } as never } as never });
      continue;
    }
    const actions = (rule.actions as unknown as AutomationAction[]) ?? [];
    let error: string | null = null;
    const actionResults: unknown[] = [];
    for (const a of actions) {
      try {
        actionResults.push(await runAction(a, { organizationId: params.organizationId, payload: payloadWithTrigger }));
      } catch (e) {
        error = String(e);
        actionResults.push({ error });
        break;
      }
    }
    await prisma.automationRun.create({
      data: {
        ruleId: rule.id,
        organizationId: params.organizationId,
        triggerEvent: params.trigger,
        triggerPayload: params.payload as never,
        status: error ? "failed" : "success",
        result: { actions: actionResults } as never,
        error,
      } as never,
    });
    logger.info({ msg: "automation run", event: "automation.run", ruleId: rule.id, trigger: params.trigger, organizationId: params.organizationId } as never);
    results.push({ ruleId: rule.id, actions: actionResults, error });
  }
  return results;
}

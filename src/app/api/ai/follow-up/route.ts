import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { followUpSchemaReq } from "@/lib/validations/ai";
import { followUpSchema } from "@/lib/ai/schemas";
import { followUpPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = followUpSchemaReq.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const call = await prisma.call.findFirst({
    where: { id: parsed.data.callId, organizationId },
    include: { transcript: true, deal: { include: { company: true, primaryContact: true } } },
  });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const dealId = parsed.data.dealId ?? call.dealId ?? null;
  if (!dealId) return NextResponse.json({ error: "Deal required — call sem deal e dealId não informado" }, { status: 400 });

  const deal = call.deal ?? await prisma.deal.findFirst({ where: { id: dealId, organizationId }, include: { company: true } as never });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const insights = await prisma.aIInsight.findMany({ where: { callId: call.id, organizationId }, take: 10, orderBy: { createdAt: "desc" } });

  const prompt = followUpPrompt({
    transcript: call.transcript?.content ?? null,
    deal,
    insights,
    company: (deal as never as { company: unknown }).company ?? null,
    contact: (deal as never as { primaryContact: unknown }).primaryContact ?? null,
  });

  const provider = getAIProvider();
  const { model } = modelForTask("summarization");
  const t0 = Date.now();

  try {
    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Gere follow-up drafts B2B em pt-BR. Nunca invente compromissos.",
      prompt,
      schema: followUpSchema,
      temperature: 0.4,
    });

    // Human-in-the-loop: persist as DRAFT only
    const created = [];
    for (const d of result.drafts) {
      const row = await prisma.followUp.create({
        data: {
          organizationId,
          dealId: (deal as { id: string }).id,
          callId: call.id,
          type: d.type as never,
          subject: (d as { subject?: string | null }).subject ?? null,
          content: d.content,
          status: "DRAFT" as never,
        } as never,
      });
      created.push(row);
    }

    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "FollowUpAgent", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await auditLog({ organizationId, userId, action: "followup.generated", entityType: "Call", entityId: call.id, metadata: { count: created.length } as never });
    for (const f of created) fireTriggers({ organizationId, event: "followup.created", payload: { id: f.id, dealId: f.dealId, callId: f.callId, type: f.type }, idempotencyKey: `followup.created:${f.id}` });

    return NextResponse.json({ drafts: result.drafts, followUps: created });
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "FollowUpAgent", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

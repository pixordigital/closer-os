import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { analyzeSchema } from "@/lib/ai/schemas";
import { analyzePrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import { getDiscoveryWithHealth } from "@/lib/discovery";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();

  const call = await prisma.call.findFirst({
    where: { id, organizationId },
    include: { transcript: true, deal: { include: { company: true } } },
  });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  if (!call.transcript?.content?.trim()) return NextResponse.json({ error: "Call sem transcript — adicione transcript antes de analisar" }, { status: 400 });

  const deal = call.deal;
  let discovery: unknown = null;
  if (deal) {
    const { fields } = await getDiscoveryWithHealth(deal.id);
    discovery = fields;
  }

  const prompt = analyzePrompt({
    transcript: call.transcript.content,
    deal: deal ? { name: deal.name, stage: deal.stage, painSummary: (deal as never as { painSummary: string | null }).painSummary } : null,
    discovery,
    company: (deal as never as { company: unknown })?.company ?? null,
  });

  const provider = getAIProvider();
  const { model } = modelForTask("reasoning");
  const t0 = Date.now();

  try {
    await prisma.call.update({ where: { id }, data: { analysisStatus: "PROCESSING" as never } });

    const result = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é Call Analyst B2B. Analise transcript e retorne JSON no schema pedido.",
      prompt,
      schema: analyzeSchema,
      temperature: 0.2,
    });

    // persist discovery updates (TRANSCRIPT source) + insights
    let discoveryApplied = 0;
    if (deal && result.discoveryUpdates?.length) {
      for (const u of result.discoveryUpdates) {
        const status = u.status as "UNKNOWN" | "PARTIAL" | "CONFIRMED";
        const source = (u.source ?? "TRANSCRIPT") as "TRANSCRIPT" | "AI_INFERENCE";
        await prisma.discoveryField.upsert({
          where: { dealId_key: { dealId: deal.id, key: u.key as string } },
          create: { dealId: deal.id, key: u.key as string, status, value: u.value, confidence: u.confidence ?? null, source } as never,
          update: { status, value: u.value, confidence: u.confidence ?? null, source } as never,
        });
        discoveryApplied++;
      }
    }

    let insightsCreated = 0;
    for (const ins of result.insights ?? []) {
      await prisma.aIInsight.create({
        data: {
          organizationId,
          dealId: deal?.id ?? null,
          callId: call.id,
          type: ins.type,
          title: ins.title,
          evidence: ins.evidence,
          confidence: ins.confidence ?? null,
          whyItMatters: ins.whyItMatters,
          recommendedAction: ins.recommendedAction,
        } as never,
      });
      insightsCreated++;
    }

    await prisma.call.update({ where: { id }, data: { analysisStatus: "COMPLETED" as never } });

    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "CallAnalyst", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await auditLog({ organizationId, userId, action: "call.analyzed", entityType: "Call", entityId: id, metadata: { insightsCreated, discoveryApplied } as never });
    fireTriggers({ organizationId, event: "call.completed", payload: { id, callId: id, dealId: deal?.id ?? call.dealId, insightsCreated, discoveryApplied }, idempotencyKey: `call.analyzed:${id}:${Date.now()}` });
    try{ const { runAllAgents } = await import("@/lib/agents/autonomous"); await runAllAgents(organizationId, "call.completed", { callId: id, dealId: deal?.id ?? call.dealId }); }catch{}
    // P0-2 coach loop: se insight de objeção/descoberta fraca, cria recomendação de roleplay
    try{
      const low = (result.insights ?? []).find((ins:{type:string})=>["missed_opportunity","objection","discovery_gap"].includes(ins.type));
      if(low){
        const recTitle = low.type==="objection" ? `Treinar objeção: ${(low as {title:string}).title}` : `Treinar discovery: ${(low as {title:string}).title}`;
        await prisma.aIRecommendation.create({ data:{ organizationId, userId, type:"roleplay", title: recTitle, reason: (low as {whyItMatters:string}).whyItMatters ?? (low as {evidence:string}).evidence, payload: low as never } as never });
        await prisma.sellerSkill.upsert({ where:{ userId_skill:{ userId, skill: (low as {type:string}).type } } as never, create:{ userId, skill:(low as {type:string}).type, currentScore: 45, sampleSize:1 } as never, update:{ currentScore: 45 } as never }).catch(()=>{});
      }
    }catch{}

    return NextResponse.json({ ...result, _meta: { discoveryApplied, insightsCreated } });
  } catch (e) {
    await prisma.call.update({ where: { id }, data: { analysisStatus: "FAILED" as never } }).catch(() => {});
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "CallAnalyst", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

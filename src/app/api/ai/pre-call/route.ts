import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { preCallSchema } from "@/lib/validations/ai";
import { preCallBriefSchema } from "@/lib/ai/schemas";
import { preCallPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";
import { getDiscoveryWithHealth } from "@/lib/discovery";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = preCallSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, organizationId }, include: { company: true, primaryContact: true } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const { fields: discoveryFields } = await getDiscoveryWithHealth(deal.id);
  const calls = await prisma.call.findMany({
    where: { organizationId, dealId: deal.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { transcript: { select: { content: true } } },
  });

  const prompt = preCallPrompt({
    company: deal.company,
    contact: deal.primaryContact,
    deal: { name: deal.name, stage: deal.stage, value: deal.value, painSummary: deal.painSummary },
    discovery: discoveryFields,
    calls: calls.map((c) => ({ title: c.title, status: c.status, transcript: c.transcript?.content?.slice(0, 800) ?? null })),
  });

  const provider = getAIProvider();
  const { model } = modelForTask("reasoning");
  const t0 = Date.now();
  try {
    const brief = await generateStructuredWithRetry(provider, {
      model,
      system: "Você é um analista pré-call B2B. Gere briefing acionável.",
      prompt,
      schema: preCallBriefSchema,
      temperature: 0.3,
    });
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "PreCallAgent", latencyMs, estimatedCost: estimateCost(model, null, null) });
    await auditLog({ organizationId, userId, action: "ai.pre_call_generated", entityType: "Deal", entityId: deal.id, metadata: { model } as never });
    return NextResponse.json(brief);
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateStructured", agent: "PreCallAgent", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

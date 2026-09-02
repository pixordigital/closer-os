import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { messageCreateSchema } from "@/lib/validations/roleplay";
import { getAIProvider } from "@/lib/ai/init";
import { prospectSystemPrompt } from "@/lib/ai/roleplay-prompts";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { modelForTask } from "@/lib/ai/provider";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const session = await prisma.roleplaySession.findFirst({
    where: { id, organizationId, userId },
    include: { scenario: true, messages: { orderBy: { timestamp: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "ACTIVE") return NextResponse.json({ error: "Session not active — complete or abandoned" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = messageCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // persist seller message
  await prisma.roleplayMessage.create({
    data: { sessionId: id, speaker: "SELLER" as never, content: parsed.data.content } as never,
  });

  const allMessages = await prisma.roleplayMessage.findMany({ where: { sessionId: id }, orderBy: { timestamp: "asc" } });
  const transcript = allMessages.map((m) => ({ speaker: m.speaker as string, content: m.content }));

  // generate prospect reply via AI
  const provider = getAIProvider();
  const { model } = modelForTask("reasoning");
  const system = prospectSystemPrompt({
    persona: session.scenario.persona,
    difficulty: session.scenario.difficulty,
    publicContext: session.scenario.publicContext,
    hiddenContext: (session.scenario as unknown as { hiddenContext: unknown }).hiddenContext,
    trainingObjective: session.scenario.trainingObjective,
    objections: (session.scenario as unknown as { objections: unknown }).objections,
    transcript,
  });

  const t0 = Date.now();
  try {
    const reply = await provider.generateText({ model, system, prompt: parsed.data.content, temperature: 0.7, maxTokens: 280 });
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateText", agent: "RoleplayAgent", latencyMs, estimatedCost: estimateCost(model, null, null) });

    const msg = await prisma.roleplayMessage.create({
      data: { sessionId: id, speaker: "PROSPECT" as never, content: reply.trim() } as never,
    });
    return NextResponse.json({ seller: parsed.data.content, prospect: msg });
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model, operation: "generateText", agent: "RoleplayAgent", latencyMs, status: "error" });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const session = await prisma.roleplaySession.findFirst({ where: { id, organizationId, userId } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const messages = await prisma.roleplayMessage.findMany({ where: { sessionId: id }, orderBy: { timestamp: "asc" } });
  return NextResponse.json({ items: messages });
}

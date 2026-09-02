import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { askSchema } from "@/lib/validations/search";
import { collectMemoryChunks, semanticRank } from "@/lib/memory";
import { getAIProvider } from "@/lib/ai/init";
import { askPrompt } from "@/lib/ai/ask-prompts";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const chunks = await collectMemoryChunks(organizationId, 40);
  const provider = getAIProvider();
  const ranked = await semanticRank(parsed.data.question, chunks, (texts)=>provider.embed(texts), 8);
  const profile = await prisma.sellerProfile.findUnique({ where: { userId } }).catch(()=>null);
  const prompt = askPrompt({ question: parsed.data.question, chunks: ranked.map(r=>({ ...r.chunk, score: r.score })), profile });

  const t0 = Date.now();
  try {
    const answer = await provider.generateText({ system: "Você é Ask Closer OS. Responda com dados reais apenas. No Evidence = Unknown.", prompt, temperature: 0.3, maxTokens: 700 });
    const latencyMs = Date.now()-t0;
    await logAIUsage({ organizationId, userId, provider: provider.name, model: "ask", operation: "generateText", agent: "AskAgent", latencyMs, estimatedCost: estimateCost("gpt-4o-mini", null, null) });
    await auditLog({ organizationId, userId, action: "ai.ask", entityType: "Ask", metadata: { question: parsed.data.question.slice(0,200) } as never });
    return NextResponse.json({ answer, sources: ranked.map(r=>({ ...r.chunk, score: r.score })) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

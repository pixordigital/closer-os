import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { detectObjection, suggestionFor } from "@/lib/live-coach";
import { z } from "zod";

const schema = z.object({ text: z.string().min(2).max(2000), context: z.string().max(500).optional() });

export async function POST(req: Request) {
  await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { text } = parsed.data;
  const hit = detectObjection(text);
  if (!hit) return NextResponse.json({ objection: null, suggestion: null, transcript: text });
  const play = suggestionFor(hit.cat);
  let aiSuggestion: string | null = null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é coach de vendas. Dada fala do prospect com objeção, responda em pt-BR com 1 frase de contorno + 1 pergunta poderosa. Seja direto, sem enrolação." },
            { role: "user", content: `Objeção: ${hit.label} (${hit.cat}). Fala: "${text}". Playbook: ${play.suggestion} / ${play.question}` },
          ],
          max_tokens: 180,
          temperature: 0.7,
        }),
      });
      const j = await r.json() as { choices?: { message?: { content?: string } }[] };
      aiSuggestion = j.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {}
  }
  return NextResponse.json({
    objection: hit,
    playbook: { suggestion: play.suggestion, question: play.question, label: play.label },
    ai: aiSuggestion,
    transcript: text,
  });
}

import { HALLUCINATION_GUARD } from "./prompts";
export function askPrompt(ctx: { question: string; chunks: { kind: string; title: string; text: string; href: string; score?: number }[]; profile?: unknown }) {
  return `${HALLUCINATION_GUARD}
Tarefa: ASK CLOSER OS (§73) — responda pergunta usando APENAS dados reais abaixo. Se dados insuficientes, diga "Not enough data" e diga o que falta. Cite fontes por href quando usar.

Pergunta: """${ctx.question}"""

Contexto vendedor: ${JSON.stringify(ctx.profile).slice(0, 1500)}

Memória relevante (ranked):
${ctx.chunks.map((c,i)=>`${i+1}. [${c.kind}] ${c.title} — ${c.text.slice(0,600)} (href:${c.href} score:${(c.score??0).toFixed(2)})`).join("\n")}

Responda em pt-BR, direto, baseado em evidência.`;
}

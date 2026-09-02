import { HALLUCINATION_GUARD } from "./ai/prompts";

export function buildCopilotPrompt(ctx: { deal?: unknown; transcriptSlice?: string; discoveryHealth?: number }) {
  return `${HALLUCINATION_GUARD}

Tarefa: COPILOT em tempo real para call B2B. Gere 2-3 sugestões curtas (pergunta ou próximo passo).
Cada sugestão precisa evidence (quote ou "No Evidence"), confidence 0-1, whyItMatters. Se não há evidência, marque Unknown e confidence baixa.
Retorne JSON: { suggestions: [{ text, evidence, confidence, whyItMatters }] }

Deal: ${JSON.stringify(ctx.deal ?? null).slice(0, 3000)}
Health discovery: ${ctx.discoveryHealth ?? "unknown"}%
Transcript (slice):
"""${(ctx.transcriptSlice ?? "(sem transcript)").slice(0, 6000)}"""
`;
}

export const COPILOT_SCHEMA_HINT = `{"suggestions":[{"text":"...","evidence":"...","confidence":0.8,"whyItMatters":"..."}]}`;

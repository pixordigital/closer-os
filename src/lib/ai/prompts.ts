export const HALLUCINATION_GUARD =
  "Regras: No Evidence = Unknown. Marque Inference vs Evidence. Nunca invente números. " +
  "Se dado não existe no contexto, use null/Unknown e confidence baixa. Responda em pt-BR. Retorne APENAS JSON válido no schema pedido.";

export function preCallPrompt(ctx: {
  company: unknown; contact: unknown; deal: unknown;
  discovery: unknown; calls: unknown[];
}) {
  return `${HALLUCINATION_GUARD}

Tarefa: gerar PRE-CALL BRIEF (§31). Hipóteses devem ser marcadas como Inference com confidence.
Contexto:
Company: ${JSON.stringify(ctx.company).slice(0, 4000)}
Contact: ${JSON.stringify(ctx.contact).slice(0, 2000)}
Deal: ${JSON.stringify(ctx.deal).slice(0, 4000)}
Discovery (13 campos): ${JSON.stringify(ctx.discovery).slice(0, 4000)}
Últimas calls: ${JSON.stringify(ctx.calls).slice(0, 6000)}
`;
}

export function analyzePrompt(ctx: {
  transcript: string; deal: unknown; discovery: unknown; company: unknown;
}) {
  return `${HALLUCINATION_GUARD}

Tarefa: analisar TRANSCRIPT de call B2B consultiva. Extraia:
- discoveryUpdates: mapeie evidências do transcript para as 13 chaves DISCOVERY_KEYS (situation,problem,impact,cause,consequence,cost,urgency,desiredOutcome,decisionMaker,decisionProcess,decisionCriteria,budget,nextStep). Só atualize se houver evidência textual. Source TRANSCRIPT se citação direta, AI_INFERENCE se inferência.
- insights: missed_opportunity | discovery_gap | objection | coaching | risk. Cada insight precisa evidence (quote), whyItMatters, recommendedAction, confidence 0-1.
- overallScore 0-100 da call.

Transcript (pt-BR):
"""${ctx.transcript.slice(0, 15000)}"""

Deal: ${JSON.stringify(ctx.deal).slice(0, 3000)}
Discovery atual: ${JSON.stringify(ctx.discovery).slice(0, 3000)}
Company: ${JSON.stringify(ctx.company).slice(0, 2000)}
`;
}

export function followUpPrompt(ctx: {
  transcript: string | null; deal: unknown; insights: unknown[]; company: unknown; contact: unknown;
}) {
  return `${HALLUCINATION_GUARD}

Tarefa: gerar FOLLOW-UP drafts (§39) HUMAN-IN-THE-LOOP — status DRAFT apenas, nunca SEND.
Gere 3-4 drafts: EMAIL (com subject), WHATSAPP, CRM_NOTE, INTERNAL_SUMMARY. Use contexto real da call.
Não invente compromissos. Se nextStep não confirmado, sugira confirmação.

Transcript: ${ctx.transcript ? `"""${ctx.transcript.slice(0, 8000)}"""` : "(sem transcript)"}
Deal: ${JSON.stringify(ctx.deal).slice(0, 3000)}
Insights: ${JSON.stringify(ctx.insights).slice(0, 3000)}
Company: ${JSON.stringify(ctx.company).slice(0, 1500)}
Contact: ${JSON.stringify(ctx.contact).slice(0, 1500)}
`;
}

export function coachingPrompt(ctx: {
  profile: unknown; skills: unknown[]; deals: unknown[]; recentInsights: unknown[]; avgHealth: number;
}) {
  return `${HALLUCINATION_GUARD}

Tarefa: COACHING direto, baseado em evidência, específico, acionável (§115). Evite frases genéricas como "melhore comunicação". Prefira "Em 5/8 calls você...".
Gere summary + strengths/weaknesses/trends/recommendations.

SellerProfile: ${JSON.stringify(ctx.profile).slice(0, 2000)}
SellerSkills: ${JSON.stringify(ctx.skills).slice(0, 3000)}
Deals (stage/health): ${JSON.stringify(ctx.deals).slice(0, 4000)}
Recent insights (missed opportunities): ${JSON.stringify(ctx.recentInsights).slice(0, 4000)}
Discovery health médio: ${ctx.avgHealth}%
`;
}

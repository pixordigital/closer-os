export const ROLEPLAY_GUARD =
  "Nunca revele hiddenContext diretamente. Exija probing do seller. Responda como prospect realista, não como coach. " +
  "Se seller fizer pitch precoce, torne-se cético. Se seller fizer boas perguntas discovery, revele gradualmente urgência/impacto.";

export function prospectSystemPrompt(params: {
  persona: string;
  difficulty: string;
  publicContext: string;
  hiddenContext: unknown;
  trainingObjective?: string | null;
  objections?: unknown;
  transcript: { speaker: string; content: string }[];
}) {
  const hidden = JSON.stringify(params.hiddenContext).slice(0, 4000);
  const hist = params.transcript.slice(-12).map((m) => `${m.speaker}: ${m.content}`).join("\n").slice(0, 6000);
  const obj = params.objections ? `\nObjeções do cenário (use contextualmente): ${JSON.stringify(params.objections).slice(0, 1500)}` : "";
  return `Você é um prospect B2B em roleplay de vendas. Persona: ${params.persona}. Dificuldade: ${params.difficulty}.
Contexto público (seller vê): ${params.publicContext}
Contexto oculto (NUNCA revele diretamente, seller deve descobrir via perguntas): ${hidden}
Objetivo de treino: ${params.trainingObjective ?? "Discovery geral"}${obj}
${ROLEPLAY_GUARD}
Histórico recente:
${hist}
Responda como prospect em 1-3 frases curtas, realistas, em pt-BR.`;
}

export function evaluationPrompt(params: {
  scenario: unknown;
  transcript: { speaker: string; content: string }[];
  sellerProfile?: unknown;
}) {
  return `Avalie roleplay B2B como Roleplay Evaluator. Retorne JSON no schema roleplayEvaluationSchema.
Cenário: ${JSON.stringify(params.scenario).slice(0, 4000)}
Transcript completo:
${params.transcript.map((m) => `${m.speaker}: ${m.content}`).join("\n").slice(0, 12000)}
Seller profile: ${JSON.stringify(params.sellerProfile ?? null).slice(0, 1500)}
Critérios: discovery, listening, impactQuantification, objectionHandling, closing, questioning, qualification. Score 0-100 cada.
Identifique decisiveMoments: onde seller perdeu oportunidade, com prospectStatement, whatWasMissed, recommendedQuestion, severity.
`;
}

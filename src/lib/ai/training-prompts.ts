import { HALLUCINATION_GUARD } from "./prompts";
export function trainingPlannerPrompt(ctx: {
  weakestSkills: { skill: string; score: number }[];
  recentWeaknesses: string[];
  strengths: string[];
  availableScenarios: { id: string; title: string; difficulty: string; trainingObjective: string | null }[];
}) {
  return `${HALLUCINATION_GUARD}
Tarefa: gerar Training Plan semanal (§69) focado nas weakest skills. Use cenários disponíveis quando couber (scenarioId). Se nenhum couber, deixe null.
Não invente skills; use só as listadas como weakest.

Weakest skills (score 0-100): ${JSON.stringify(ctx.weakestSkills)}
Weaknesses recentes: ${JSON.stringify(ctx.recentWeaknesses).slice(0, 2000)}
Strengths: ${JSON.stringify(ctx.strengths).slice(0, 1000)}
Cenários disponíveis: ${JSON.stringify(ctx.availableScenarios).slice(0, 4000)}
Regras: 3-5 exercícios, title claro, type em [discovery_drill, objection_drill, closing_drill, negotiation_drill, executive_drill, qualification_drill, impact_drill, followup_drill].
Retorne JSON no schema trainingPlanSchema.`;
}

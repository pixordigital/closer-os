import { prisma } from "./db";

// 13 DISCOVERY keys — §29 (CLOSER-based)
export const DISCOVERY_KEYS = [
  "situation",
  "problem",
  "impact",
  "cause",
  "consequence",
  "cost",
  "urgency",
  "desiredOutcome",
  "decisionMaker",
  "decisionProcess",
  "decisionCriteria",
  "budget",
  "nextStep",
] as const;
export type DiscoveryKey = typeof DISCOVERY_KEYS[number];

export const DISCOVERY_LABEL: Record<DiscoveryKey, string> = {
  situation: "Situation",
  problem: "Problem",
  impact: "Impact",
  cause: "Cause",
  consequence: "Consequence",
  cost: "Cost",
  urgency: "Urgency",
  desiredOutcome: "Desired Outcome",
  decisionMaker: "Decision Maker",
  decisionProcess: "Decision Process",
  decisionCriteria: "Decision Criteria",
  budget: "Budget",
  nextStep: "Next Step",
};

export const DISCOVERY_GROUP: Record<DiscoveryKey, string> = {
  situation: "Context", problem: "Context", impact: "Context",
  cause: "Context", consequence: "Context", cost: "Context",
  urgency: "Vision", desiredOutcome: "Vision",
  decisionMaker: "Decision", decisionProcess: "Decision",
  decisionCriteria: "Decision", budget: "Decision", nextStep: "Decision",
};

export const DISCOVERY_HINT: Record<DiscoveryKey, string> = {
  situation: "Contexto atual do prospect",
  problem: "Dor principal explicitada",
  impact: "Impacto quantificado da dor",
  cause: "Causa raiz",
  consequence: "Consequência se nada mudar",
  cost: "Custo da inação / impacto financeiro",
  urgency: "Por que agora? janela temporal",
  desiredOutcome: "Resultado desejado / sucesso",
  decisionMaker: "Quem decide (papel + nome)",
  decisionProcess: "Como decidem, etapas",
  decisionCriteria: "Critérios de decisão",
  budget: "Budget disponível / faixa",
  nextStep: "Próximo passo acordado",
};

// status → points: UNKNOWN 0, PARTIAL 50, CONFIRMED 100 — avg 0-100
export function scoreForStatus(s: string): number {
  if (s === "CONFIRMED") return 100;
  if (s === "PARTIAL") return 50;
  return 0;
}

export function computeHealth(fields: { key: string; status: string }[]): number {
  if (fields.length === 0) return 0;
  // only count known keys; missing keys count as 0
  const byKey = new Map(fields.map(f => [f.key, f.status]));
  let total = 0;
  for (const k of DISCOVERY_KEYS) total += scoreForStatus(byKey.get(k) ?? "UNKNOWN");
  return Math.round(total / DISCOVERY_KEYS.length);
}

export function healthColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}
export function healthBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

// Ensure every deal has 13 rows; create missing UNKNOWN
export async function ensureDiscoveryFields(dealId: string) {
  const existing = await prisma.discoveryField.findMany({ where: { dealId }, select: { key: true } });
  const have = new Set(existing.map(r => r.key));
  const missing = DISCOVERY_KEYS.filter(k => !have.has(k));
  if (missing.length === 0) return;
  await prisma.discoveryField.createMany({
    data: missing.map(key => ({ dealId, key, status: "UNKNOWN" as const, source: "CRM" as const })),
    skipDuplicates: true,
  });
}

export async function getDiscoveryWithHealth(dealId: string) {
  await ensureDiscoveryFields(dealId);
  const fields = await prisma.discoveryField.findMany({ where: { dealId }, orderBy: { key: "asc" } });
  // stable order = DISCOVERY_KEYS order
  const order = new Map<string, number>(DISCOVERY_KEYS.map((k, i) => [k, i] as [string, number]));
  fields.sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
  const health = computeHealth(fields);
  return { fields, health };
}

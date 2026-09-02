import { DISCOVERY_KEYS } from "./discovery";

// §76 Deal Risk — rule-based; AI-assisted later
export type RiskSignal =
  | "MISSING_DM"
  | "NO_NEXT_STEP"
  | "NO_URGENCY"
  | "NO_IMPACT"
  | "LONG_INACTIVITY"
  | "REPEATED_OBJECTIONS"
  | "COMPETITOR"
  | "UNCLEAR_DECISION_PROCESS";

export const RISK_LABEL: Record<RiskSignal, string> = {
  MISSING_DM: "Sem decision maker",
  NO_NEXT_STEP: "Sem próximo passo",
  NO_URGENCY: "Sem urgência",
  NO_IMPACT: "Impacto não quantificado",
  LONG_INACTIVITY: "Inatividade longa",
  REPEATED_OBJECTIONS: "Objeções repetidas",
  COMPETITOR: "Concorrente presente",
  UNCLEAR_DECISION_PROCESS: "Processo decisório incerto",
};

export type DealRisk = { score: number; level: "low"|"medium"|"high"; signals: RiskSignal[]; reasons: string[] };

export function riskLevel(score: number): DealRisk["level"] {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function computeDealRisk(input: {
  discoveryFields: { key: string; status: string }[];
  deal: { nextStep?: string | null; updatedAt: Date | string; stage: string };
  objectionsCount: number;
  hasCompetitorObjection: boolean;
}): DealRisk {
  const byKey = new Map(input.discoveryFields.map(f=>[f.key, f.status]));
  const signals: RiskSignal[] = [];
  const reasons: string[] = [];

  const dm = byKey.get("decisionMaker") ?? "UNKNOWN";
  if (dm === "UNKNOWN") { signals.push("MISSING_DM"); reasons.push(RISK_LABEL.MISSING_DM); }

  const ns = byKey.get("nextStep") ?? "UNKNOWN";
  const dealNs = (input.deal.nextStep ?? "").trim();
  if (ns === "UNKNOWN" && !dealNs) { signals.push("NO_NEXT_STEP"); reasons.push(RISK_LABEL.NO_NEXT_STEP); }

  if ((byKey.get("urgency") ?? "UNKNOWN") === "UNKNOWN") { signals.push("NO_URGENCY"); reasons.push(RISK_LABEL.NO_URGENCY); }

  const impact = byKey.get("impact") ?? "UNKNOWN";
  const cost = byKey.get("cost") ?? "UNKNOWN";
  if (impact === "UNKNOWN" && cost === "UNKNOWN") { signals.push("NO_IMPACT"); reasons.push(RISK_LABEL.NO_IMPACT); }

  const days = (Date.now() - new Date(input.deal.updatedAt).getTime()) / 86400000;
  if (days > 14 || (days > 8 && ["DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION"].includes(input.deal.stage))) {
    signals.push("LONG_INACTIVITY"); reasons.push(`${RISK_LABEL.LONG_INACTIVITY} (${Math.floor(days)}d)`);
  }

  if (input.objectionsCount >= 2) { signals.push("REPEATED_OBJECTIONS"); reasons.push(`${RISK_LABEL.REPEATED_OBJECTIONS} (${input.objectionsCount})`); }

  if (input.hasCompetitorObjection) { signals.push("COMPETITOR"); reasons.push(RISK_LABEL.COMPETITOR); }

  if ((byKey.get("decisionProcess") ?? "UNKNOWN") === "UNKNOWN") { signals.push("UNCLEAR_DECISION_PROCESS"); reasons.push(RISK_LABEL.UNCLEAR_DECISION_PROCESS); }

  // 13pts each ~ cap 100
  const score = Math.min(100, signals.length * 13 + (signals.includes("MISSING_DM") && signals.includes("NO_NEXT_STEP") ? 10 : 0));
  return { score, level: riskLevel(score), signals, reasons };
}

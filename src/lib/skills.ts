// canonical skill taxonomy §70 — shared across RoleplayEvaluator, Coach, TrainingPlanner
export const SKILLS = [
  "discovery",
  "listening",
  "questioning",
  "qualification",
  "painDiagnosis",
  "impactQuantification",
  "urgency",
  "decisionProcess",
  "decisionCriteria",
  "objectionHandling",
  "valueCommunication",
  "negotiation",
  "closing",
  "followUp",
] as const;
export type SkillKey = typeof SKILLS[number];

export const SKILL_LABEL: Record<SkillKey, string> = {
  discovery: "Discovery",
  listening: "Listening",
  questioning: "Questioning",
  qualification: "Qualification",
  painDiagnosis: "Pain Diagnosis",
  impactQuantification: "Impact Quant.",
  urgency: "Urgency",
  decisionProcess: "Decision Process",
  decisionCriteria: "Decision Criteria",
  objectionHandling: "Objection Handling",
  valueCommunication: "Value Comm.",
  negotiation: "Negotiation",
  closing: "Closing",
  followUp: "Follow-up",
};

export function skillLabel(k: string) { return (SKILL_LABEL as Record<string,string>)[k] ?? k; }

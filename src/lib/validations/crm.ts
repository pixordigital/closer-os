import { z } from "zod";

// ── Company §24 ────────────────────────────────────────────────
export const companyCreateSchema = z.object({
  name: z.string().min(2).max(120),
  website: z.string().url().max(255).optional().or(z.literal("").transform(() => undefined)),
  industry: z.string().max(80).optional(),
  companySize: z.string().max(40).optional(),
  revenueRange: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  cnpj: z.string().max(18).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});
export const companyUpdateSchema = companyCreateSchema.partial();
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

// ── Contact §25 ────────────────────────────────────────────────
export const decisionRoleEnum = z.enum(["DECISION_MAKER","INFLUENCER","CHAMPION","USER","BLOCKER","UNKNOWN"]);

export const contactCreateSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2).max(120),
  role: z.string().max(80).optional(),
  email: z.string().email().max(254).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional(),
  linkedinUrl: z.string().url().max(255).optional().or(z.literal("").transform(() => undefined)),
  decisionRole: decisionRoleEnum.optional().default("UNKNOWN"),
  consentAt: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  consentSource: z.string().max(80).optional().nullable(),
  notes: z.string().max(5000).optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial().omit({ companyId: true }).extend({
  companyId: z.string().cuid().optional(),
});
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

// ── Deal §26 ───────────────────────────────────────────────────
export const dealStageEnum = z.enum(["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"]);

export const dealCreateSchema = z.object({
  companyId: z.string().cuid(),
  primaryContactId: z.string().cuid().optional().nullable(),
  ownerId: z.string().min(1).max(64).optional().nullable(),
  name: z.string().min(2).max(160),
  stage: dealStageEnum.optional().default("LEAD"),
  value: z.coerce.number().nonnegative().max(999999999999).optional().nullable(),
  currency: z.string().length(3).optional().default("BRL"),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  source: z.string().max(80).optional(),
  currentSolution: z.string().max(5000).optional(),
  desiredOutcome: z.string().max(5000).optional(),
  painSummary: z.string().max(5000).optional(),
  urgency: z.string().max(80).optional(),
  decisionProcess: z.string().max(5000).optional(),
  decisionCriteria: z.string().max(5000).optional(),
  nextStep: z.string().max(5000).optional(),
  nextStepDate: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  lostReason: z.string().max(5000).optional(),
});
export const dealUpdateSchema = dealCreateSchema.partial().extend({
  companyId: z.string().cuid().optional(),
}).superRefine((data, ctx) => {
  if (data.stage === "LOST" && (!data.lostReason || !data.lostReason.trim())) {
    ctx.addIssue({ code: "custom", path: ["lostReason"], message: "Motivo da perda obrigatório ao mover para LOST" });
  }
  const needsNext = data.stage && !["LEAD","WON","LOST"].includes(data.stage);
  if (needsNext && data.stage) {
    if (data.nextStep !== undefined && (!data.nextStep || !String(data.nextStep).trim())) {
      ctx.addIssue({ code: "custom", path: ["nextStep"], message: "Próximo passo obrigatório para avançar estágio" });
    }
    if (data.nextStepDate !== undefined && !data.nextStepDate) {
      ctx.addIssue({ code: "custom", path: ["nextStepDate"], message: "Data do próximo passo obrigatória" });
    }
  }
});
export type DealCreateInput = z.infer<typeof dealCreateSchema>;

// ── Task ───────────────────────────────────────────────────────
export const taskStatusEnum = z.enum(["TODO","IN_PROGRESS","DONE","CANCELLED"]);

export const taskCreateSchema = z.object({
  dealId: z.string().cuid().optional().nullable(),
  assigneeId: z.string().min(1).max(64).optional().nullable(),
  title: z.string().min(2).max(160),
  description: z.string().max(5000).optional(),
  dueDate: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  status: taskStatusEnum.optional().default("TODO"),
});
export const taskUpdateSchema = taskCreateSchema.partial();
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

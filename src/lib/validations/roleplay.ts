import { z } from "zod";

export const difficultyEnum = z.enum(["LEVEL_1","LEVEL_2","LEVEL_3","LEVEL_4","LEVEL_5","LEVEL_6","LEVEL_7","BOSS"]);

export const scenarioCreateSchema = z.object({
  title: z.string().min(3).max(160),
  persona: z.string().min(2).max(60),
  difficulty: difficultyEnum.optional().default("LEVEL_1"),
  industry: z.string().max(80).optional().nullable(),
  companySize: z.string().max(40).optional().nullable(),
  ticket: z.string().max(40).optional().nullable(),
  publicContext: z.string().min(10).max(5000),
  hiddenContext: z.record(z.string(), z.unknown()),
  painPoints: z.array(z.string().max(200)).optional().nullable(),
  businessImpact: z.string().max(5000).optional().nullable(),
  urgency: z.string().max(80).optional().nullable(),
  decisionMaker: z.string().max(120).optional().nullable(),
  decisionProcess: z.string().max(5000).optional().nullable(),
  decisionCriteria: z.string().max(5000).optional().nullable(),
  budget: z.string().max(80).optional().nullable(),
  currentSolution: z.string().max(5000).optional().nullable(),
  competitors: z.array(z.string().max(80)).optional().nullable(),
  objections: z.array(z.string().max(200)).optional().nullable(),
  trainingObjective: z.string().max(5000).optional().nullable(),
});
export const scenarioUpdateSchema = scenarioCreateSchema.partial();
export type ScenarioCreateInput = z.infer<typeof scenarioCreateSchema>;

export const sessionCreateSchema = z.object({
  scenarioId: z.string().cuid(),
  objective: z.string().max(5000).optional().nullable(),
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

export const messageCreateSchema = z.object({
  content: z.string().min(1).max(5000),
});
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

import { z } from "zod";

export const trainingPlanSchema = z.object({
  title: z.string().min(1).max(120),
  focus: z.string().min(1).max(80),
  goal: z.string().min(1).max(500),
  week: z.number().int().min(1).max(52).nullable().optional(),
  exercises: z.array(z.object({
    title: z.string().min(1).max(120),
    type: z.string().min(1), // discovery_drill|objection_drill|closing_drill|...
    scenarioId: z.string().nullable().optional(),
  })).min(1).max(6),
});
export type TrainingPlanAI = z.infer<typeof trainingPlanSchema>;

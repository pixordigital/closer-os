import { z } from "zod";

// Evaluation output — §64 (§97 structured example)
export const roleplayEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  skills: z.record(z.string(), z.number().min(0).max(100)),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  decisiveMoments: z.array(z.object({
    timestamp: z.string().optional().nullable(),
    prospectStatement: z.string().min(1),
    whatWasMissed: z.string().min(1),
    recommendedQuestion: z.string().min(1),
    severity: z.enum(["low","medium","high"]).default("medium"),
  })).default([]),
  errorTypes: z.array(z.string()).default([]),
  recommendedExercises: z.array(z.string()).default([]),
});
export type RoleplayEvaluationResult = z.infer<typeof roleplayEvaluationSchema>;

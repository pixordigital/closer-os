import { z } from "zod";

export const taskStatusEnum = z.enum(["TODO","IN_PROGRESS","DONE","CANCELLED"]);

export const planCreateSchema = z.object({
  title: z.string().min(2).max(160),
  week: z.coerce.number().int().min(1).max(52).optional().nullable(),
  focus: z.string().max(80).optional().nullable(),
  goal: z.string().max(5000).optional().nullable(),
  exercises: z.array(z.object({
    title: z.string().min(2).max(160),
    type: z.string().min(2).max(80),
    scenarioId: z.string().cuid().optional().nullable(),
  })).max(20).optional().default([]),
});
export const planUpdateSchema = planCreateSchema.partial();

export const exercisePatchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  type: z.string().min(2).max(80).optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.string().optional().nullable().transform(v => v ? new Date(v as string) : null),
  scenarioId: z.string().cuid().optional().nullable(),
});

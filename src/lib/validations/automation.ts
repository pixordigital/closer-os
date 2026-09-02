import { z } from "zod";
import { AUTOMATION_TRIGGERS } from "@/lib/automation";

export const triggerEnum = z.enum(AUTOMATION_TRIGGERS as unknown as [string, ...string[]]);

export const automationCreateSchema = z.object({
  trigger: triggerEnum,
  enabled: z.boolean().optional().default(true),
  conditions: z.array(z.object({ field: z.string().min(1).max(80), op: z.enum(["eq","ne","exists","contains"]), value: z.unknown().optional() })).max(10).optional().nullable(),
  actions: z.array(z.object({
    type: z.enum(["analyze_transcript","generate_insights","generate_followup","create_task","recommend_roleplay","enqueue_job"]),
    params: z.record(z.string(), z.unknown()).optional().default({}),
  })).min(1).max(10),
});

export const automationPatchSchema = automationCreateSchema.partial();

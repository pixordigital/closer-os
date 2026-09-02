import { z } from "zod";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const endpointCreateSchema = z.object({
  url: z.string().url().max(2000),
  secret: z.string().min(16).max(200),
  events: z.array(z.enum(WEBHOOK_EVENTS as unknown as [string, ...string[]])).min(1).max(20),
  enabled: z.boolean().optional().default(true),
});
export const endpointPatchSchema = endpointCreateSchema.partial();
export const inboundSchema = z.object({
  event: z.string().min(2).max(80),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  idempotencyKey: z.string().max(200).optional(),
});

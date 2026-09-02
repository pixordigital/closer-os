import { z } from "zod";
import { DISCOVERY_KEYS } from "@/lib/discovery";

export const discoveryStatusEnum = z.enum(["UNKNOWN","PARTIAL","CONFIRMED"]);
export const discoverySourceEnum = z.enum(["TRANSCRIPT","USER","CRM","AI_INFERENCE","EXTERNAL_RESEARCH"]);
export const discoveryKeyEnum = z.enum(DISCOVERY_KEYS as unknown as [string, ...string[]]);

export const discoveryFieldPatchSchema = z.object({
  key: discoveryKeyEnum,
  status: discoveryStatusEnum.optional(),
  value: z.string().max(5000).nullable().optional(),
  confidence: z.coerce.number().min(0).max(1).nullable().optional(),
  source: discoverySourceEnum.optional(),
});
export type DiscoveryFieldPatch = z.infer<typeof discoveryFieldPatchSchema>;

export const discoveryBatchPatchSchema = z.object({
  fields: z.array(discoveryFieldPatchSchema).min(1).max(13),
});

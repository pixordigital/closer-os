import { z } from "zod";

export const profileUpsertSchema = z.object({
  sellingStyle: z.string().max(120).optional().nullable(),
  targetMarket: z.string().max(120).optional().nullable(),
  targetTicket: z.string().max(80).optional().nullable(),
  preferredMethod: z.string().max(120).optional().nullable(),
  strengths: z.array(z.string().max(120)).max(10).optional().nullable(),
  weaknesses: z.array(z.string().max(120)).max(10).optional().nullable(),
  personalRisks: z.array(z.string().max(200)).max(10).optional().nullable(),
  coachingPriorities: z.array(z.string().max(200)).max(5).optional().nullable(),
});
export type ProfileUpsertInput = z.infer<typeof profileUpsertSchema>;

// strings comma-separated form helper -> array; keep strict for API (already arrays)
export const profilePatchSchema = profileUpsertSchema;

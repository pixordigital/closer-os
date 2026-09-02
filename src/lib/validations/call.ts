import { z } from "zod";

export const callStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]);

export const callCreateSchema = z.object({
  dealId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  title: z.string().min(2).max(160),
  scheduledAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
  duration: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  status: callStatusEnum.optional().default("SCHEDULED"),
});
export const callUpdateSchema = z.object({
  dealId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  title: z.string().min(2).max(160).optional(),
  scheduledAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
  duration: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  status: callStatusEnum.optional(),
});
export type CallCreateInput = z.infer<typeof callCreateSchema>;
export type CallUpdateInput = z.infer<typeof callUpdateSchema>;

export const transcriptUpsertSchema = z.object({
  content: z.string().min(1, "Transcript vazio").max(100_000),
  language: z.string().min(2).max(10).optional().default("pt-BR"),
  speakerSegments: z
    .array(
      z.object({
        speaker: z.enum(["SELLER", "PROSPECT", "SYSTEM"]),
        text: z.string().min(1).max(5000),
        start: z.number().min(0).optional(),
        end: z.number().min(0).optional(),
      }),
    )
    .optional()
    .nullable(),
});
export type TranscriptUpsertInput = z.infer<typeof transcriptUpsertSchema>;

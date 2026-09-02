import { z } from "zod";

export const integrationKindEnum = z.enum(["calendar", "transcript", "crm"]);
export const integrationProviderEnum = z.enum(["mock-calendar", "mock-transcript", "google-calendar"]);

export const integrationCreateSchema = z.object({
  provider: integrationProviderEnum,
  kind: integrationKindEnum.optional(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const integrationPatchSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["connected", "error", "disconnected"]).optional(),
});

export const integrationImportSchema = z.object({
  text: z.string().max(100_000).optional(),
  url: z.string().url().max(2000).optional(),
  dealId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  title: z.string().min(2).max(160).optional().default("Imported call"),
}).refine((v) => !!v.text?.trim() || !!v.url, { message: "text or url required", path: ["text"] });

export const transcribeSchema = z.object({
  text: z.string().min(1).max(100_000).optional(),
  audioUrl: z.string().url().max(2000).optional(),
  language: z.string().min(2).max(10).optional().default("pt-BR"),
}).refine((v) => !!v.text?.trim() || !!v.audioUrl, { message: "text or audioUrl required" });

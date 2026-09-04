import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().max(40).optional().nullable().transform((v) => v?.trim() || undefined),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().nonnegative().max(999999999999),
  currency: z.string().length(3).optional().default("BRL"),
  active: z.coerce.boolean().optional().default(true),
});
export const productUpdateSchema = productCreateSchema.partial();
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const quotaCreateSchema = z.object({
  userId: z.string().min(1).max(64),
  period: z.string().regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM"),
  target: z.coerce.number().nonnegative().max(999999999999),
});
export const quotaUpdateSchema = quotaCreateSchema.partial().omit({ userId: true, period: true }).extend({
  target: z.coerce.number().nonnegative().max(999999999999).optional(),
});
export type QuotaCreateInput = z.infer<typeof quotaCreateSchema>;

export const proposalCreateSchema = z.object({
  dealId: z.string().cuid(),
  title: z.string().min(2).max(200),
  html: z.string().max(200_000).optional().nullable(),
  items: z.array(z.object({ name: z.string().min(1).max(120), qty: z.coerce.number().min(0.01), unitPrice: z.coerce.number().nonnegative(), total: z.coerce.number().nonnegative().optional() })).optional().nullable(),
  total: z.coerce.number().nonnegative().max(999999999999).optional().nullable(),
  currency: z.string().length(3).optional().default("BRL"),
  expiresAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
});
export const proposalUpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  html: z.string().max(200_000).optional().nullable(),
  items: z.array(z.object({ name: z.string().min(1).max(120), qty: z.coerce.number().min(0.01), unitPrice: z.coerce.number().nonnegative(), total: z.coerce.number().nonnegative().optional() })).optional().nullable(),
  total: z.coerce.number().nonnegative().max(999999999999).optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
  expiresAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
});

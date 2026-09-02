import { z } from "zod";
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  semantic: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
});
export const askSchema = z.object({
  question: z.string().min(3).max(2000),
});

import { z } from "zod";
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  semantic: z.preprocess((v) => {
    if (typeof v === "string") {
      const low = v.toLowerCase().trim();
      if (low === "true" || low === "1") return true;
      if (low === "false" || low === "0" || low === "") return false;
    }
    return v;
  }, z.boolean().optional().default(false)),
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
});
export const askSchema = z.object({
  question: z.string().min(3).max(2000),
});

import { z } from "zod";

export const preCallSchema = z.object({ dealId: z.string().cuid() });
export const followUpSchemaReq = z.object({ callId: z.string().cuid(), dealId: z.string().cuid().optional() });
export const coachingSchemaReq = z.object({ periodDays: z.coerce.number().int().min(1).max(90).optional().default(30) });

import { prisma } from "@/lib/db";

export async function logAIUsage(params: {
  organizationId?: string | null;
  userId?: string | null;
  provider: string;
  model: string;
  operation: string;
  agent?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCost?: number | null;
  latencyMs?: number | null;
  status?: string;
}) {
  try {
    await prisma.aIUsage.create({
      data: {
        organizationId: params.organizationId ?? undefined,
        userId: params.userId ?? undefined,
        provider: params.provider,
        model: params.model,
        operation: params.operation,
        agent: params.agent ?? null,
        inputTokens: params.inputTokens ?? null,
        outputTokens: params.outputTokens ?? null,
        estimatedCost: params.estimatedCost ?? null,
        latencyMs: params.latencyMs ?? null,
        status: params.status ?? "success",
      } as never,
    });
  } catch { /* never break main flow */ }
}

// rough cost table per 1k tokens (USD) — ponytail: static, update when pricing changes
const COST_PER_1K: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
  "gpt-4o": { in: 0.005, out: 0.015 },
  "text-embedding-3-small": { in: 0.00002, out: 0 },
};
export function estimateCost(model: string, inputTokens?: number | null, outputTokens?: number | null): number | null {
  const c = COST_PER_1K[model];
  if (!c) return null;
  const cost = (inputTokens ?? 0) / 1000 * c.in + (outputTokens ?? 0) / 1000 * c.out;
  return Math.round(cost * 1e6) / 1e6;
}

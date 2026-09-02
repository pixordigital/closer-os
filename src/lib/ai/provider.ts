// §11 AI Provider Abstraction — app code never imports OpenAI/Anthropic directly.
import { z } from "zod";

// ── Interface (§11) ────────────────────────────────────────────
export interface AIProvider {
  readonly name: string;
  generateText(opts: GenerateTextOpts): Promise<string>;
  generateStructured<T>(opts: GenerateStructuredOpts<T>): Promise<T>;
  embed(texts: string[]): Promise<number[][]>;
}

export type GenerateTextOpts = {
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type GenerateStructuredOpts<T> = GenerateTextOpts & {
  schema: z.ZodType<T>;
  schemaName?: string;
};

// ── Registry + routing (§12) ───────────────────────────────────

const registry = new Map<string, AIProvider>();

export function registerProvider(p: AIProvider) {
  registry.set(p.name, p);
}
export function getProvider(name?: string): AIProvider {
  const key = name ?? process.env.AI_PROVIDER ?? "openai";
  const p = registry.get(key);
  if (!p) throw new Error(`AI provider not found: ${key}. Registered: ${[...registry.keys()].join(", ") || "(none)"}`);
  return p;
}

// Task → model routing (§12) — cheap models for cheap tasks
export const MODEL_ROUTING: Record<string, { provider: string; model: string }> = {
  classification: { provider: "openai", model: "gpt-4o-mini" },
  extraction: { provider: "openai", model: "gpt-4o-mini" },
  summarization: { provider: "openai", model: "gpt-4o-mini" },
  reasoning: { provider: "openai", model: "gpt-4o" },
  coaching: { provider: "openai", model: "gpt-4o" },
  embeddings: { provider: "openai", model: "text-embedding-3-small" },
};

export function modelForTask(task: string): { provider: string; model: string } {
  return MODEL_ROUTING[task] ?? { provider: process.env.AI_PROVIDER ?? "openai", model: "gpt-4o-mini" };
}

// ── Structured output helper (retry on schema failure) ─────────

export async function generateStructuredWithRetry<T>(
  provider: AIProvider,
  opts: GenerateStructuredOpts<T>,
  retries = 1,
): Promise<T> {
  try {
    return await provider.generateStructured(opts);
  } catch (e) {
    if (retries <= 0) throw e;
    return provider.generateStructured({
      ...opts,
      prompt: opts.prompt + "\n\nPrevious output failed validation. Return ONLY valid JSON matching the schema. No prose.",
    });
  }
}

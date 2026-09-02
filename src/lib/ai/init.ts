import { registerProvider, getProvider } from "./provider";
import { OpenAIProvider } from "./providers/openai";
import { MockProvider } from "./mock";

let inited = false;
export function ensureAIProviders() {
  if (inited) return;
  inited = true;
  // Always register mock as fallback
  registerProvider(new MockProvider());
  if (process.env.OPENAI_API_KEY) {
    registerProvider(new OpenAIProvider());
  }
  // Anthropic/Gemini/OpenRouter can be added similarly when keys present
}

export function getAIProvider() {
  ensureAIProviders();
  // prefer openai if key set, else mock
  const want = process.env.OPENAI_API_KEY ? (process.env.AI_PROVIDER ?? "openai") : "mock";
  try {
    return getProvider(want);
  } catch {
    return getProvider("mock");
  }
}

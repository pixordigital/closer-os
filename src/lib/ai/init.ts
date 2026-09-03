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
  // prefer openai if key set, else mock — but if LITELLM_URL set, use openai via litellm
  const hasKey = !!process.env.OPENAI_API_KEY || !!process.env.LITELLM_URL;
  const want = hasKey ? (process.env.AI_PROVIDER ?? "openai") : "mock";
  try {
    return getProvider(want);
  } catch {
    return getProvider("mock");
  }
}

export async function getOrgAIProvider(organizationId:string){
  ensureAIProviders();
  try{
    const { prisma } = await import("@/lib/db");
    const { decrypt } = await import("@/lib/crypto");
    const cfg = await prisma.aIConfig.findUnique({ where:{ organizationId } }) as unknown as { provider:string, openaiKey:string|null, litellmUrl:string|null, litellmKey:string|null, useLitellm:boolean }|null;
    if(cfg?.openaiKey){
      const key = (()=>{ try{ return decrypt(cfg.openaiKey!);}catch{return cfg.openaiKey!}})();
      const base = cfg.useLitellm ? (cfg.litellmUrl ?? process.env.LITELLM_URL ?? undefined) : undefined;
      const litellmKey = cfg.litellmKey ? (()=>{ try{ return decrypt(cfg.litellmKey!);}catch{return cfg.litellmKey!}})() : undefined;
      // if litellm, apiKey is litellm master key, base is litellm url
      if(cfg.useLitellm && litellmKey) return new OpenAIProvider(litellmKey, base);
      if(cfg.useLitellm && base) return new OpenAIProvider(key, base);
      return new OpenAIProvider(key);
    }
  }catch{}
  return getAIProvider();
}

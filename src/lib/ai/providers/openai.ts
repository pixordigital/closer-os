// OpenAI provider — loaded only if OPENAI_API_KEY set.
import { z } from "zod";
import type { AIProvider, GenerateTextOpts, GenerateStructuredOpts } from "../provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;
  private base: string;

  constructor(apiKey?: string, base?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.base = base ?? process.env.LITELLM_URL ?? "https://api.openai.com/v1";
    if(this.base.endsWith("/")) this.base=this.base.slice(0,-1);
    if(!this.base.endsWith("/v1") && this.base.includes("litellm")) this.base=this.base+"/v1";
  }

  private headers() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` };
  }

  async generateText(opts: GenerateTextOpts): Promise<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model ?? "gpt-4o-mini",
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return j.choices[0].message.content as string;
  }

  async generateStructured<T>(opts: GenerateStructuredOpts<T>): Promise<T> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model ?? "gpt-4o-mini",
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
        temperature: opts.temperature ?? 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const j = await res.json();
    const raw = j.choices[0].message.content as string;
    const parsed = JSON.parse(raw);
    return opts.schema.parse(parsed) as T;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.base}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI embed ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return j.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

// Anthropic stub — same shape, wire when ANTHROPIC_API_KEY present
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  constructor(private apiKey = process.env.ANTHROPIC_API_KEY ?? "") {}
  async generateText(_o: GenerateTextOpts): Promise<string> { throw new Error("Anthropic provider not wired — set ANTHROPIC_API_KEY and implement"); }
  async generateStructured<T>(_o: GenerateStructuredOpts<T>): Promise<T> { throw new Error("Anthropic provider not wired"); }
  async embed(_t: string[]): Promise<number[][]> { throw new Error("Anthropic has no embedding model — use OpenAI for embeddings"); }
}

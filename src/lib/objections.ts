import { PLAYBOOK, type ObjectionCat } from "./live-coach";

export type Extracted = { category: ObjectionCat; content: string; sentence: string };

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 8);
}

export function extractObjections(text: string): Extracted[] {
  const sents = splitSentences(text);
  const out: Extracted[] = [];
  for (const s of sents) {
    for (const [cat, play] of Object.entries(PLAYBOOK) as [ObjectionCat, typeof PLAYBOOK[ObjectionCat]][]) {
      if (play.patterns.some(r => r.test(s))) {
        out.push({ category: cat, content: s.slice(0, 500), sentence: s });
        break;
      }
    }
  }
  const seen = new Set<string>();
  return out.filter(o => {
    const k = o.category + ":" + o.content.toLowerCase().slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function extractWithAI(text: string): Promise<Extracted[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Extraia objeções de vendas do transcript. Categorias: ${Object.keys(PLAYBOOK).join(",")}. Retorne JSON array [{"category":"PRICE","content":"frase"}]. Se nenhuma, []. Seja preciso, pt-BR.` },
          { role: "user", content: text.slice(0, 6000) },
        ],
        response_format: { type: "json_object" } as never,
        temperature: 0.2,
        max_tokens: 800,
      }),
    });
    const j = await r.json() as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { objections?: Extracted[] } | Extracted[];
    const arr = Array.isArray(parsed) ? parsed : parsed.objections ?? [];
    return arr.filter(o => o.category && o.content).slice(0, 20) as Extracted[];
  } catch { return null; }
}

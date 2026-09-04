import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { searchQuerySchema } from "@/lib/validations/search";
import { collectMemoryChunks, semanticRank } from "@/lib/memory";
import { getAIProvider } from "@/lib/ai/init";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const parsed = searchQuerySchema.safeParse({ q: url.searchParams.get("q"), semantic: url.searchParams.get("semantic") ?? undefined, limit: url.searchParams.get("limit") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { q, semantic, limit } = parsed.data;

  // lexical base collect
  const chunks = await collectMemoryChunks(organizationId, 40);

  // quick lexical filter before semantic rerank to bound embed calls
  const qlow = q.toLowerCase();
  const lex = chunks.filter(c => `${c.title} ${c.text}`.toLowerCase().includes(qlow) || c.kind.includes(qlow));
  const candidates = lex.length >= 8 ? lex.slice(0, 40) : chunks;

  let items: { chunk: typeof chunks[number]; score: number }[];
  if (semantic) {
    const provider = getAIProvider();
    items = await semanticRank(q, candidates, (texts)=>provider.embed(texts), limit);
  } else {
    const qws = q.toLowerCase().split(/\s+/).filter(w=>w.length>1);
    items = candidates.map(c=>{
      const hay = `${c.title} ${c.text}`.toLowerCase();
      const score = qws.reduce((s,w)=>s+(hay.includes(w)?1:0),0) / (qws.length||1);
      return { chunk: c, score };
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0, limit);
    if (items.length===0) items = candidates.slice(0, limit).map(c=>({ chunk:c, score:0 }));
  }

  return NextResponse.json({ items: items.map(r=>({ ...r.chunk, score: r.score })) });
}

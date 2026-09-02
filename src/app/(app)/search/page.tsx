import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { collectMemoryChunks, semanticRank } from "@/lib/memory";
import { getAIProvider } from "@/lib/ai/init";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const semantic = sp.semantic === "true";
  if (!q) {
    return (
      <div className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold">Search (§78)</h1>
        <p className="mt-1 text-sm text-zinc-400">Busca global — companies, contacts, deals, transcripts, roleplays. Suporte semântico via embeddings.</p>
        <form className="mt-4 flex gap-2"><input name="q" placeholder="Buscar..." className="h-9 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm" /><label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" name="semantic" value="true" /> semantic</label><button type="submit" className="h-9 rounded-md bg-zinc-800 px-4 text-sm">Search</button></form>
      </div>
    );
  }
  const chunks = await collectMemoryChunks(organizationId, 40);
  let items: { chunk: typeof chunks[number]; score: number }[];
  if (semantic) {
    const provider = getAIProvider();
    items = await semanticRank(q, chunks, (texts)=>provider.embed(texts), 20);
  } else {
    const qws = q.toLowerCase().split(/\s+/).filter(w=>w.length>1);
    items = chunks.map(c=>{ const hay=`${c.title} ${c.text}`.toLowerCase(); const s=qws.reduce((a,w)=>a+(hay.includes(w)?1:0),0)/(qws.length||1); return { chunk:c, score:s }; }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,20);
    if (items.length===0) items = chunks.slice(0,8).map(c=>({ chunk:c, score:0 }));
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold">Search — &quot;{q}&quot; {semantic && <span className="text-xs text-sky-400">semantic</span>}</h1>
      <div className="mt-1 text-xs text-zinc-500">{items.length} resultados</div>
      <div className="mt-4 space-y-2">
        {items.map(({ chunk, score })=>(
          <Link key={`${chunk.kind}-${chunk.id}`} href={chunk.href} className="block rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700">
            <div className="flex items-center gap-2"><span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">{chunk.kind}</span><span className="text-sm font-medium text-zinc-100">{chunk.title}</span><span className="ml-auto text-xs text-zinc-500">{score.toFixed(2)}</span></div>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{chunk.text.slice(0,200)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

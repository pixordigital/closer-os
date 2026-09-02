"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Source = { kind: string; title: string; href: string; score: number };

export function AskPanel() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    const question = q.trim();
    if (!question) return;
    setLoading(true); setErr(null); setAnswer(null); setSources([]);
    const res = await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setAnswer(j.answer);
    setSources(j.sources ?? []);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="text-sm font-medium">Ask Closer OS (§73)</h3>
      <p className="mt-1 text-xs text-zinc-500">Pergunte sobre deals, calls, coaching — resposta com dados reais + fontes.</p>
      <div className="mt-3 flex gap-2">
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ex: Which deals have no next step?" onKeyDown={e=>e.key==="Enter" && ask()} />
        <Button size="sm" disabled={loading || !q.trim()} onClick={ask}>{loading ? "..." : "Ask"}</Button>
      </div>
      {err && <pre className="mt-3 whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      {answer && (
        <div className="mt-3 space-y-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{answer}</p>
          {sources.length>0 && (
            <div className="flex flex-wrap gap-1.5">
              {sources.map(s=>(
                <Link key={`${s.kind}-${s.href}`} href={s.href} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700">{s.kind}: {s.title}</Link>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {["Which deals have no next step?","What is my biggest weakness?","Which calls had weakest discovery?"].map(ex=>(
          <button key={ex} onClick={()=>setQ(ex)} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">{ex}</button>
        ))}
      </div>
    </div>
  );
}

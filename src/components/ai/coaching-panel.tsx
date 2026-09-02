"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Coaching = { summary: string; strengths: string[]; weaknesses: string[]; trends: string[]; recommendations: string[] };

export function CoachingPanel() {
  const [data, setData] = useState<Coaching | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function gen() {
    setLoading(true); setErr(null);
    const res = await fetch("/api/ai/coaching", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodDays: 30 }) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setData(j as Coaching);
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Coaching</h2>
        <p className="mt-1 text-xs text-zinc-500">Gera coaching direto, baseado em evidência (§115). Consome insights + skills + deals.</p>
        {err && <pre className="mt-3 whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
        <Button size="sm" className="mt-3" disabled={loading} onClick={gen}>{loading ? "Gerando..." : "Generate coaching"}</Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Coaching</h2>
        <Button size="sm" variant="outline" disabled={loading} onClick={gen}>{loading ? "..." : "Regenerar"}</Button>
      </div>
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      <p className="text-sm leading-relaxed text-zinc-200">{data.summary}</p>
      {data.strengths?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-emerald-400">Strengths</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-300">{data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      {data.weaknesses?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-amber-400">Weaknesses</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-300">{data.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      {data.trends?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-zinc-500">Trends</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-400">{data.trends.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      {data.recommendations?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-sky-400">Recommendations</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-200">{data.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
    </section>
  );
}

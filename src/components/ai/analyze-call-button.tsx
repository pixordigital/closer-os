"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AnalyzeCallButton({ callId, hasTranscript }: { callId: string; hasTranscript: boolean }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true); setErr(null); setRes(null);
    const r = await fetch(`/api/calls/${callId}/analyze`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setRes(j);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button size="sm" disabled={loading || !hasTranscript} onClick={run}>{loading ? "Analisando..." : "Analyze transcript"}</Button>
      {!hasTranscript && <span className="ml-2 text-xs text-zinc-500">adicione transcript antes</span>}
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      {res && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed">
          <div className="font-medium text-zinc-200">Análise concluída</div>
          <div className="mt-1 text-zinc-400">Discovery updates: {(res as never as { _meta?: { discoveryApplied: number } })._meta?.discoveryApplied ?? "?"} · Insights: {(res as never as { _meta?: { insightsCreated: number } })._meta?.insightsCreated ?? "?"}</div>
          {Array.isArray((res as { insights?: unknown[] }).insights) && (res as { insights: { title: string; type: string }[] }).insights.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-zinc-300">{(res as { insights: { title: string; type: string }[] }).insights.slice(0, 8).map((i, k) => <li key={k}><span className="text-zinc-500">{i.type}:</span> {i.title}</li>)}</ul>
          )}
          <details className="mt-2"><summary className="cursor-pointer text-zinc-500">JSON</summary><pre className="mt-2 overflow-auto text-[11px] text-zinc-400">{JSON.stringify(res, null, 2).slice(0, 6000)}</pre></details>
        </div>
      )}
    </div>
  );
}

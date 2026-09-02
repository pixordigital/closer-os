"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Brief = {
  companySummary: string; contactSummary: string; dealContext: string;
  knownContext: string[]; previousInteractions: string[];
  painHypotheses: { hypothesis: string; evidence?: string | null; confidence: number }[];
  businessImpact: string; questionsToInvestigate: string[]; potentialObjections: string[];
  decisionMakers: string; callObjective: string; risks: string[]; nextQuestions: string[];
};

export function PreCallPanel({ dealId }: { dealId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function gen() {
    setLoading(true); setErr(null);
    const res = await fetch("/api/ai/pre-call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealId }) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setBrief(j as Brief);
  }

  if (!brief) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Pre-call brief</h2>
        <p className="mt-1 text-xs text-zinc-500">Gera resumo com contexto, hipóteses de dor, perguntas e riscos.</p>
        {err && <pre className="mt-3 whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
        <Button size="sm" className="mt-3" disabled={loading} onClick={gen}>{loading ? "Gerando..." : "Prepare Call"}</Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Pre-call brief</h2>
        <Button size="sm" variant="outline" disabled={loading} onClick={gen}>{loading ? "..." : "Regenerar"}</Button>
      </div>
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      <div className="grid gap-3 text-sm">
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Company</div><p className="mt-1 text-zinc-300">{brief.companySummary}</p></div>
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Contact</div><p className="mt-1 text-zinc-300">{brief.contactSummary}</p></div>
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Deal context</div><p className="mt-1 text-zinc-300">{brief.dealContext}</p></div>
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Call objective</div><p className="mt-1 font-medium text-zinc-100">{brief.callObjective}</p></div>
        {brief.painHypotheses?.length > 0 && (
          <div><div className="text-xs uppercase tracking-wide text-zinc-500">Pain hypotheses</div>
            <ul className="mt-1 list-disc pl-5 text-zinc-300">{brief.painHypotheses.map((h, i) => <li key={i}>{h.hypothesis} {h.confidence != null && <span className="text-zinc-500">({Math.round(h.confidence * 100)}%)</span>} {h.evidence && <span className="text-xs text-zinc-500"> — {h.evidence}</span>}</li>)}</ul>
          </div>
        )}
        {brief.questionsToInvestigate?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-zinc-500">Questions to investigate</div><ul className="mt-1 list-disc pl-5 text-zinc-300">{brief.questionsToInvestigate.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
        {brief.nextQuestions?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-zinc-500">Next questions</div><ul className="mt-1 list-disc pl-5 text-sky-300">{brief.nextQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
        {brief.potentialObjections?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-zinc-500">Potential objections</div><p className="mt-1 text-amber-300/90">{brief.potentialObjections.join(" · ")}</p></div>}
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Decision makers</div><p className="mt-1 text-zinc-300">{brief.decisionMakers}</p></div>
        <div><div className="text-xs uppercase tracking-wide text-zinc-500">Business impact</div><p className="mt-1 text-zinc-300">{brief.businessImpact}</p></div>
        {brief.risks?.length > 0 && <div><div className="text-xs uppercase tracking-wide text-zinc-500">Risks</div><ul className="mt-1 list-disc pl-5 text-amber-300/80">{brief.risks.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
      </div>
    </section>
  );
}

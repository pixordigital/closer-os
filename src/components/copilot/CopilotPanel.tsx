"use client";
import { useCopilotStream } from "@/hooks/useCopilotStream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export function CopilotPanel({ callId, dealId }: { callId?: string; dealId?: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const url = useMemo(() => {
    if (!enabled) return null;
    const p = new URLSearchParams();
    if (callId) p.set("callId", callId);
    if (dealId) p.set("dealId", dealId);
    return `/api/copilot/stream?${p.toString()}`;
  }, [enabled, callId, dealId]);
  const { events, connected } = useCopilotStream(url);

  const suggestions = events.filter((e) => e.type === "suggestion");
  const last = suggestions[suggestions.length - 1]?.payload as { suggestions?: Array<{ text: string; evidence?: string; confidence?: number; whyItMatters?: string }> } | undefined;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Copilot (realtime)</h2>
        <div className="flex items-center gap-2">
          <Badge className={connected ? "border-zinc-700 bg-zinc-800" : "border-zinc-600 bg-zinc-700"}>{connected ? "live" : enabled ? "connecting" : "off"}</Badge>
          <Button size="sm" variant={enabled ? "ghost" : "default"} onClick={() => setEnabled((v) => !v)}>{enabled ? "Stop" : "Start"}</Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">SSE copilot — sugestões a cada ~8s por até 60s. Usa {process.env.NEXT_PUBLIC_AI_HINT ?? "Mock/OpenAI"}.</p>
      {!enabled ? (
        <p className="mt-3 text-sm text-zinc-400">Clique Start para receber sugestões contextuais da call/deal.</p>
      ) : !last?.suggestions?.length ? (
        <p className="mt-3 text-sm text-zinc-400">Aguardando sugestões…</p>
      ) : (
        <div className="mt-3 space-y-2">
          {last.suggestions.map((s, i) => (
            <div key={i} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-sm text-zinc-100">{s.text}</div>
              {s.evidence && <div className="mt-1 text-xs italic text-zinc-400">“{s.evidence}”</div>}
              <div className="mt-1 flex gap-2 text-[11px] text-zinc-500">
                {s.confidence != null && <span>{Math.round(s.confidence * 100)}%</span>}
                {s.whyItMatters && <span>· {s.whyItMatters}</span>}
              </div>
            </div>
          ))}
          <div className="text-[11px] text-zinc-500">{suggestions.length} update(s) · realtime copilot</div>
        </div>
      )}
    </section>
  );
}

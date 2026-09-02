"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TranscriptEditor({ callId, initial }: { callId: string; initial: { content: string | null; language: string | null } }) {
  const [content, setContent] = useState(initial.content ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setSaving(true); setErr(null); setOk(false);
    const body = content.trim() ? { content } : null;
    if (!body) { setErr("Transcript vazio"); setSaving(false); return; }
    const res = await fetch(`/api/calls/${callId}/transcript`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setOk(true); setTimeout(() => setOk(false), 2000);
  }

  async function del() {
    if (!confirm("Remover transcript?")) return;
    setSaving(true); setErr(null);
    const res = await fetch(`/api/calls/${callId}/transcript`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(JSON.stringify(j.error ?? j)); return; }
    setContent(""); setOk(true);
  }

  return (
    <div className="space-y-3">
      <Textarea rows={12} value={content} onChange={e => setContent(e.target.value)} placeholder="Cole transcript aqui — texto corrido MVP (diarização futura via speakerSegments)..." />
      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar transcript"}</Button>
        {content.trim() && <Button size="sm" variant="outline" disabled={saving} onClick={del} className="border-red-900 text-red-400 hover:bg-red-950">Remover</Button>}
        {ok && <span className="text-xs text-emerald-400 self-center">salvo</span>}
      </div>
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      <p className="text-[11px] text-zinc-500">MVP manual. Análise IA (Phase 5) consome este conteúdo. Max 100k chars.</p>
    </div>
  );
}

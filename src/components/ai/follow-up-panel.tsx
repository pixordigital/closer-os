"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Draft = { type: string; subject?: string | null; content: string };
type FollowUpRow = { id: string; type: string; subject: string | null; content: string; status: string };

export function FollowUpPanel({ callId, dealId }: { callId: string; dealId?: string | null }) {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [rows, setRows] = useState<FollowUpRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});

  async function gen() {
    setLoading(true); setErr(null);
    const res = await fetch("/api/ai/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId, dealId: dealId ?? undefined }) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setDrafts(j.drafts ?? []);
    setRows(j.followUps ?? []);
  }

  async function save(id: string, status?: string) {
    const payload: Record<string, unknown> = {};
    if (edit[`${id}_subject`] !== undefined) payload.subject = edit[`${id}_subject`] || null;
    if (edit[`${id}_content`] !== undefined) payload.content = edit[`${id}_content`];
    if (status) payload.status = status;
    const res = await fetch(`/api/follow-ups/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setRows((prev) => prev ? prev.map((r) => r.id === id ? { ...r, ...j } : r) : prev);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Follow-up</h2>
        <Button size="sm" disabled={loading || !dealId} onClick={gen}>{loading ? "Gerando..." : "Generate drafts"}</Button>
      </div>
      {!dealId && <p className="text-xs text-amber-400">Call sem deal — vincule deal para gerar follow-up.</p>}
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
      {drafts && <p className="text-xs text-zinc-500">{drafts.length} drafts gerados como DRAFT (human-in-the-loop). Edite e aprove.</p>}
      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2 text-xs"><span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{r.type}</span><span className="text-zinc-500">{r.status}</span></div>
              <Input className="mt-2 text-sm" placeholder="Subject (email)" defaultValue={r.subject ?? ""} onChange={(e) => setEdit((m) => ({ ...m, [`${r.id}_subject`]: e.target.value }))} />
              <Textarea rows={4} className="mt-2 text-sm" defaultValue={r.content} onChange={(e) => setEdit((m) => ({ ...m, [`${r.id}_content`]: e.target.value }))} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => save(r.id)}>Salvar</Button>
                <Button size="sm" variant="outline" onClick={() => save(r.id, "PENDING_REVIEW")}>Enviar p/ revisão</Button>
                <Button size="sm" variant="outline" onClick={() => save(r.id, "APPROVED")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => save(r.id, "SENT")}>Mark SENT</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-zinc-600">Fluxo obrigatório: GENERATE → REVIEW → APPROVE → SEND. MVP não envia automático.</p>
    </section>
  );
}

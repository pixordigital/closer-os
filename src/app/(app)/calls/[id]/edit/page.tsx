"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deals, setDeals] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [initial, setInitial] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/deals?limit=100").then((r) => r.json()).then((j) => setDeals(j.items ?? [])).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/contacts?limit=100").then((r) => r.json()).then((j) => setContacts(j.items ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    fetch(`/api/calls/${id}`).then((r) => r.json()).then((j) => {
      if (j.error) { setFetchErr(String(j.error)); return; }
      setInitial({
        title: j.title ?? "",
        dealId: j.dealId ?? "",
        contactId: j.contactId ?? "",
        scheduledAt: j.scheduledAt ? new Date(j.scheduledAt).toISOString().slice(0, 16) : "",
        duration: j.duration != null ? String(j.duration) : "",
        status: j.status ?? "SCHEDULED",
      });
    }).catch((e) => setFetchErr(String(e)));
  }, [id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, (v as string).trim()])) as never;
    if (!body.dealId) body.dealId = "" as never;
    if (!body.contactId) body.contactId = "" as never;
    // send null for cleared
    const payload: Record<string, unknown> = { ...body };
    if (payload.dealId === "") payload.dealId = null;
    if (payload.contactId === "") payload.contactId = null;
    if (payload.scheduledAt === "") payload.scheduledAt = null;
    if (payload.duration === "") payload.duration = null;
    else if (payload.duration) payload.duration = Number(payload.duration);
    const res = await fetch(`/api/calls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/calls/${id}`); router.refresh();
  }

  async function onDelete() {
    if (!confirm("Excluir call? Transcript será removido.")) return;
    const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(JSON.stringify(j.error ?? j)); return; }
    router.push("/calls"); router.refresh();
  }

  if (fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if (!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;

  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Editar call</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required defaultValue={initial.title} /></div>
            <div className="space-y-1.5"><Label>Deal</Label>
              <select name="dealId" defaultValue={initial.dealId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem deal —</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Contato</Label>
              <select name="contactId" defaultValue={initial.contactId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem contato —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Agendamento</Label><Input name="scheduledAt" type="datetime-local" defaultValue={initial.scheduledAt} /></div>
              <div className="space-y-1.5"><Label>Duração (seg)</Label><Input name="duration" type="number" min="0" defaultValue={initial.duration} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <select name="status" defaultValue={initial.status} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                {["SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir call</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

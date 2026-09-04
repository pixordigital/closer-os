"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtElapsed(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function NewCallForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const presetDealId = sp.get("dealId") ?? "";
  const [deals, setDeals] = useState<{ id: string; name: string; companyId?: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; companyId: string }[]>([]);
  const [dealId, setDealId] = useState(presetDealId);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // ponytail: timer local — sem lib, setInterval + ref, duração auto pro POST
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/deals?limit=100").then((r) => r.json()).then((j) => setDeals(j.items ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    const cid = deals.find((d) => d.id === dealId)?.companyId;
    if (!cid) {
      fetch("/api/contacts?limit=100").then((r) => r.json()).then((j) => setContacts(j.items ?? [])).catch(() => {});
      return;
    }
    fetch(`/api/contacts?companyId=${cid}&limit=100`).then((r) => r.json()).then((j) => setContacts(j.items ?? [])).catch(() => {});
  }, [dealId, deals]);

  useEffect(() => {
    if (!running) { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; return; }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function resetTimer() { setRunning(false); setElapsed(0); }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, (v as string).trim()])) as never;
    if (!body.dealId) delete body.dealId;
    if (!body.contactId) delete body.contactId;
    if (!body.scheduledAt) delete body.scheduledAt;
    // se timer rodou, usa elapsed como duration (prioridade sobre campo)
    if (elapsed > 0 && !body.duration) body.duration = String(elapsed);
    if (!body.duration) delete body.duration;
    const res = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/calls/${j.id}`); router.refresh();
  }

  async function quickCompleted() {
    const titleEl = document.querySelector<HTMLInputElement>('input[name="title"]');
    const title = titleEl?.value?.trim();
    if (!title) { setErr("Preencha o título antes do registro rápido"); return; }
    setErr(null); setLoading(true);
    const body: Record<string, unknown> = {
      title,
      status: "COMPLETED",
      duration: elapsed > 0 ? elapsed : undefined,
      scheduledAt: new Date().toISOString(),
    };
    const dealSel = document.querySelector<HTMLSelectElement>('select[name="dealId"]')?.value;
    const contactSel = document.querySelector<HTMLSelectElement>('select[name="contactId"]')?.value;
    if (dealSel) body.dealId = dealSel;
    if (contactSel) body.contactId = contactSel;
    const res = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/calls/${j.id}`); router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Nova call — registro em 10s pós-ligação</CardTitle>
          <p className="text-xs text-zinc-500">Timer local → duração auto. Vincula deal/contato. D-1 WhatsApp agenda sozinho se scheduledAt futuro.</p>
        </CardHeader>
        <CardContent>
          {/* timer */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
            <div className="flex h-10 w-20 items-center justify-center rounded bg-zinc-900 font-mono text-lg font-bold text-zinc-100">{fmtElapsed(elapsed)}</div>
            <div className="flex flex-wrap gap-1.5">
              {!running ? <Button size="sm" variant="outline" onClick={() => setRunning(true)} disabled={loading}>▶ Iniciar</Button> : <Button size="sm" variant="outline" onClick={() => setRunning(false)}>⏸ Pausar</Button>}
              <Button size="sm" variant="ghost" onClick={resetTimer} disabled={loading}>Zerar</Button>
              <Button size="sm" onClick={quickCompleted} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">✓ Registrar concluída agora</Button>
            </div>
            {elapsed > 0 && <span className="text-xs text-zinc-500">{elapsed}s → duration auto</span>}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required placeholder="Ex: Discovery — Acme" /></div>
            <div className="space-y-1.5"><Label>Deal</Label>
              <select name="dealId" value={dealId} onChange={(e) => setDealId(e.target.value)} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem deal —</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Contato</Label>
              <select name="contactId" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem contato —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Agendamento</Label><Input name="scheduledAt" type="datetime-local" /></div>
              <div className="space-y-1.5"><Label>Duração (seg){elapsed > 0 && <span className="text-emerald-400"> · timer {elapsed}s</span>}</Label><Input name="duration" type="number" min="0" placeholder={elapsed > 0 ? String(elapsed) : "1800"} defaultValue={elapsed > 0 ? elapsed : undefined} key={elapsed} /></div>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <select name="status" defaultValue="SCHEDULED" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                {["SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Criar call"}</Button>
            <p className="text-center text-xs text-zinc-500">Mobile: Api.kt <code className="text-zinc-400">POST /api/calls {"{title, dealId, duration, status}"}</code> já vinculado.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewCallPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Carregando...</div>}><NewCallForm /></Suspense>;
}

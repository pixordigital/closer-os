"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DISCOVERY_KEYS, DISCOVERY_LABEL, DISCOVERY_HINT,
  healthColor, healthBarColor,
  type DiscoveryKey,
} from "@/lib/discovery";

type Field = {
  id: string;
  key: string;
  status: "UNKNOWN" | "PARTIAL" | "CONFIRMED";
  value: string | null;
  confidence: number | null;
  source: string;
};

const STATUS_COLOR: Record<string,string> = {
  UNKNOWN: "border-zinc-700 bg-zinc-800 text-zinc-400",
  PARTIAL: "border-amber-800 bg-amber-950 text-amber-300",
  CONFIRMED: "border-emerald-800 bg-emerald-950 text-emerald-300",
};

const GROUPS: Record<string, DiscoveryKey[]> = {
  Context: ["situation","problem","impact","cause","consequence","cost"],
  Vision: ["urgency","desiredOutcome"],
  Decision: ["decisionMaker","decisionProcess","decisionCriteria","budget","nextStep"],
};

export function DiscoveryPanel({ dealId, initialFields, initialHealth }: { dealId: string; initialFields: Field[]; initialHealth: number }) {
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [health, setHealth] = useState(initialHealth);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Field> & { key?: string }>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byKey = new Map(fields.map(f => [f.key, f]));

  async function save(key: string) {
    setSaving(true); setErr(null);
    const payload: Record<string, unknown> = { key };
    if (draft.status !== undefined) payload.status = draft.status;
    if (draft.source !== undefined) payload.source = draft.source;
    if (draft.value !== undefined) payload.value = draft.value?.trim() ? draft.value : null;
    if (draft.confidence !== undefined) payload.confidence = draft.confidence;
    // default source USER when setting value
    if (payload.value && !payload.source) payload.source = "USER";
    const res = await fetch(`/api/deals/${dealId}/discovery`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(()=>({}));
    setSaving(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    // server returns { fields, health }
    if (j.fields && typeof j.health === "number") {
      const order = new Map<string,number>(DISCOVERY_KEYS.map((k,i)=>[k,i] as [string,number]));
      const sorted: Field[] = [...(j.fields as Field[])].sort((a,b)=>(order.get(a.key)??99)-(order.get(b.key)??99));
      setFields(sorted);
      setHealth(j.health);
    } else {
      // fallback optimistic
      setFields(prev => prev.map(f => f.key===key ? { ...f, ...payload as Partial<Field> } : f));
    }
    setEditing(null);
    setDraft({});
  }

  function startEdit(f: Field) {
    setEditing(f.key);
    setDraft({ key: f.key, status: f.status, value: f.value ?? "", confidence: f.confidence ?? null, source: f.source });
    setErr(null);
  }

  const confirmed = fields.filter(f=>f.status==="CONFIRMED").length;
  const partial = fields.filter(f=>f.status==="PARTIAL").length;
  const unknown = fields.filter(f=>f.status==="UNKNOWN").length;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Discovery</h2>
          <p className="mt-0.5 text-xs text-zinc-500">13 campos · CLOSER · status + fonte + confiança</p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${healthColor(health)}`}>{health}%</div>
          <div className="text-[11px] text-zinc-500">{confirmed}✓ {partial}~ {unknown}?</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full transition-all ${healthBarColor(health)}`} style={{ width: `${health}%` }} />
      </div>
      {err && <pre className="mt-3 whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}

      <div className="mt-5 space-y-6">
        {Object.entries(GROUPS).map(([group, keys])=>(
          <div key={group}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{group}</div>
            <div className="grid gap-2">
              {keys.map(k=>{
                const f = byKey.get(k);
                if (!f) return null;
                const isEditing = editing === k;
                return (
                  <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{DISCOVERY_LABEL[k as DiscoveryKey]}</div>
                        <div className="text-[11px] text-zinc-500">{DISCOVERY_HINT[k as DiscoveryKey]}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[f.status] ?? ""}`}>{f.status}</span>
                        <Badge className="text-[11px]">{f.source}</Badge>
                        {!isEditing && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={()=>startEdit(f)}>Editar</Button>}
                      </div>
                    </div>
                    {!isEditing ? (
                      <>
                        <div className="mt-2 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{f.value?.trim() ? f.value : <span className="text-zinc-600">— vazio</span>}</div>
                        {f.confidence != null && <div className="mt-1 text-xs text-zinc-500">confiança {(f.confidence*100).toFixed(0)}%</div>}
                      </>
                    ) : (
                      <div className="mt-3 space-y-3 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-xs text-zinc-400">Status</span>
                            <select
                              value={draft.status as string}
                              onChange={e=>setDraft(d=>({...d, status: e.target.value as Field["status"]}))}
                              className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-100"
                            >
                              <option value="UNKNOWN">UNKNOWN</option>
                              <option value="PARTIAL">PARTIAL</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-zinc-400">Fonte</span>
                            <select
                              value={draft.source as string}
                              onChange={e=>setDraft(d=>({...d, source: e.target.value}))}
                              className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-100"
                            >
                              {["USER","CRM","TRANSCRIPT","AI_INFERENCE","EXTERNAL_RESEARCH"].map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </label>
                        </div>
                        <label className="block space-y-1">
                          <span className="text-xs text-zinc-400">Valor</span>
                          <Textarea
                            rows={3}
                            value={(draft.value as string) ?? ""}
                            onChange={e=>setDraft(d=>({...d, value: e.target.value}))}
                            placeholder={DISCOVERY_HINT[k as DiscoveryKey]}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs text-zinc-400">Confiança (0–100)</span>
                          <input
                            type="number" min={0} max={100} step={5}
                            value={draft.confidence != null ? Math.round((draft.confidence as number)*100) : ""}
                            onChange={e=>{
                              const v = e.target.value.trim();
                              if (v==="") setDraft(d=>({...d, confidence: null}));
                              else {
                                const n = Math.max(0, Math.min(100, Number(v)));
                                setDraft(d=>({...d, confidence: n/100}));
                              }
                            }}
                            placeholder="ex: 80"
                            className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-100"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={saving} onClick={()=>save(k)}>{saving ? "Salvando..." : "Salvar"}</Button>
                          <Button size="sm" variant="outline" onClick={()=>{ setEditing(null); setDraft({}); setErr(null); }}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewScenarioPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, (v as string).trim()]));
    let hiddenContext: Record<string, unknown>;
    try { hiddenContext = JSON.parse(raw.hiddenContext || "{}"); } catch (ex) { setErr("hiddenContext JSON inválido: " + String(ex)); setLoading(false); return; }
    const body: Record<string, unknown> = {
      title: raw.title, persona: raw.persona, difficulty: raw.difficulty || "LEVEL_1",
      industry: raw.industry || null, companySize: raw.companySize || null, ticket: raw.ticket || null,
      publicContext: raw.publicContext, hiddenContext,
      trainingObjective: raw.trainingObjective || null,
      objections: raw.objections ? raw.objections.split(",").map(s=>s.trim()).filter(Boolean) : null,
    };
    const res = await fetch("/api/roleplay/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/roleplay/${j.id}`); router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Novo cenário</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required placeholder="Ex: CFO SaaS 51-200 — Objeção preço" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Persona *</Label><Input name="persona" required placeholder="CFO, CEO, CTO..." /></div>
              <div className="space-y-1.5"><Label>Dificuldade</Label>
                <select name="difficulty" defaultValue="LEVEL_1" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                  {["LEVEL_1","LEVEL_2","LEVEL_3","LEVEL_4","LEVEL_5","LEVEL_6","LEVEL_7","BOSS"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Industry</Label><Input name="industry" placeholder="SaaS" /></div>
              <div className="space-y-1.5"><Label>Company size</Label><Input name="companySize" placeholder="51-200" /></div>
              <div className="space-y-1.5"><Label>Ticket</Label><Input name="ticket" placeholder="R$ 45k" /></div>
            </div>
            <div className="space-y-1.5"><Label>Public context *</Label><Textarea name="publicContext" rows={3} required placeholder="Contexto que seller vê antes da sessão..." /></div>
            <div className="space-y-1.5"><Label>Hidden context (JSON) *</Label><Textarea name="hiddenContext" rows={4} required defaultValue={`{\n  "realProblem": "Perda de 30 leads/mês",\n  "monthlyImpact": "R$ 30.000",\n  "budget": "R$ 25k",\n  "decisionMaker": "CFO+CEO",\n  "urgency": "Alta"\n}`} />
              <p className="text-[11px] text-zinc-500">JSON — nunca revelado ao seller em sessão, só para prospect LLM e avaliação.</p>
            </div>
            <div className="space-y-1.5"><Label>Objeções (vírgula)</Label><Input name="objections" placeholder="Preço, Temos fornecedor, Preciso falar com sócio" /></div>
            <div className="space-y-1.5"><Label>Training objective</Label><Input name="trainingObjective" placeholder="Discovery — Quantificar impacto" /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Criar cenário"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

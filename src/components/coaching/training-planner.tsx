"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Exercise = { id: string; title: string; type: string; status: string; scenarioId: string | null };
type Plan = { id: string; title: string; focus: string | null; goal: string | null; week: number | null; trainingExercises: Exercise[]; createdAt: string };

export function TrainingPlanner({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setErr(null);
    const res = await fetch("/api/ai/training-plan", { method: "POST" });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    setPlans(prev=>[j as Plan, ...prev]);
  }

  async function toggleExercise(planId: string, ex: Exercise) {
    const next = ex.status === "DONE" ? "TODO" : ex.status === "TODO" ? "IN_PROGRESS" : "DONE";
    const res = await fetch(`/api/training-plans/${planId}/exercises/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    if (!res.ok) return;
    setPlans(prev=>prev.map(p=>p.id===planId ? { ...p, trainingExercises: p.trainingExercises.map(e=>e.id===ex.id ? { ...e, status: next } : e)} : p));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Training Plans (§69)</h3>
        <Button size="sm" disabled={loading} onClick={generate}>{loading ? "Gerando..." : "Generate plan (AI)"}</Button>
      </div>
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}

      {plans.length===0 && <p className="text-sm text-zinc-500">Nenhum plano. Gere um com base nas weakest skills.</p>}
      {plans.map(p=>(
        <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-zinc-100">{p.title}</div>
              <div className="mt-1 text-xs text-zinc-500">Focus: {p.focus ?? "—"} {p.week ? `· Week ${p.week}` : ""} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}</div>
              {p.goal && <p className="mt-2 text-sm text-zinc-300">{p.goal}</p>}
            </div>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{p.trainingExercises.length} exercises</span>
          </div>
          <ul className="mt-3 space-y-2">
            {p.trainingExercises.map(ex=>(
              <li key={ex.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div>
                  <div className="text-sm text-zinc-100">{ex.title}</div>
                  <div className="text-xs text-zinc-500">{ex.type}{ex.scenarioId ? <Link href={`/roleplay/${ex.scenarioId}`} className="ml-2 text-sky-400 hover:underline">scenario →</Link> : null}</div>
                </div>
                <button onClick={()=>toggleExercise(p.id, ex)} className={`rounded px-2 py-1 text-xs font-medium ${ex.status==="DONE" ? "bg-emerald-900/40 text-emerald-300" : ex.status==="IN_PROGRESS" ? "bg-amber-900/30 text-amber-300" : "bg-zinc-800 text-zinc-400"}`}>{ex.status}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

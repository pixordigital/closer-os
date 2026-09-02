"use client";
import { useEffect, useState } from "react";
import { SKILL_LABEL, type SkillKey } from "@/lib/skills";

type SkillRow = { skill: string; currentScore: number; targetScore: number | null; trend: string; sampleSize: number; history: number[] };

export function SkillsPanel() {
  const [items, setItems] = useState<SkillRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills").then(r=>r.json()).then(j=>{
      if (j.items) setItems(j.items);
      else setErr(JSON.stringify(j, null, 2));
    }).catch(e=>setErr(String(e)));
  }, []);

  if (err) return <pre className="rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>;
  if (!items) return <p className="text-sm text-zinc-500">Carregando skills...</p>;
  if (items.length === 0) return <p className="text-sm text-zinc-500">Sem skills ainda — faça roleplays ou analise calls para gerar scores.</p>;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(s=>(
        <div key={s.skill} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{(SKILL_LABEL as Record<string,string>)[s.skill] ?? s.skill}</span>
            <span className={`text-[11px] ${s.trend==="up" ? "text-emerald-400" : s.trend==="down" ? "text-red-400" : "text-zinc-500"}`}>{s.trend} · n={s.sampleSize}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold">{s.currentScore}</span>
            <span className="text-xs text-zinc-500">/ 100</span>
            {s.targetScore != null && <span className="text-xs text-sky-400">→ {s.targetScore}</span>}
          </div>
          {/* sparkline */}
          <div className="mt-2 flex items-end gap-0.5 h-6">
            {(s.history ?? []).map((v,i)=>(
              <span key={i} className="flex-1 rounded-sm bg-zinc-700" style={{ height: `${Math.max(4, v)}%`, opacity: 0.6 + (i/(s.history.length||1))*0.4 }} title={`${v}`} />
            ))}
            {(s.history?.length ?? 0) === 0 && <span className="text-[11px] text-zinc-600">sem histórico</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

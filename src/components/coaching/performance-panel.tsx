"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Perf = {
  overallScore:number; summary:string;
  strengths:{title:string,evidence:string,whyGood:string}[];
  improvements:{title:string,evidence:string,severity:string,suggestion:string}[];
  decisiveMoments:{prospectStatement:string,whatWasMissed:string,recommendedQuestion:string,impact:string,severity:string}[];
  recommendedRoleplays:{title:string,difficulty:string,trainingObjective:string,reason:string,scenarioId:string|null}[];
  nextSteps:string[];
};

export function PerformancePanel({ callId, hasTranscript, existing }:{ callId:string, hasTranscript:boolean, existing?:Perf|null }){
  const [loading,setLoading]=useState(false);
  const [res,setRes]=useState<Perf|null>(existing ?? null);
  const [err,setErr]=useState<string|null>(null);

  async function run(){
    setLoading(true); setErr(null);
    const r=await fetch(`/api/calls/${callId}/performance`,{method:"POST"});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setErr(j.error ?? "Falha"); return; }
    setRes(j as Perf);
  }

  const scoreColor=(s:number)=> s>=75?"text-emerald-400": s>=55?"text-amber-400":"text-red-400";

  if(!hasTranscript) return <Card><CardContent className="pt-4 text-sm text-zinc-500">Adicione transcript para analisar performance.</CardContent></Card>;

  return (
    <Card className="border-zinc-800">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">Agente IA — Performance Coach <Button size="sm" onClick={run} disabled={loading}>{loading?"Analisando...":res?"Re-analisar":"Analisar performance"}</Button></CardTitle>
        <p className="text-xs text-zinc-500">Diz onde foi bem, pontos de atenção e sugere roleplays para treinar.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-xs text-red-400">{err}</p>}
        {!res && !err && <p className="text-sm text-zinc-500">Clique em Analisar para o agente ler o transcript e gerar strengths, melhorias e treinos recomendados.</p>}
        {res && (
          <>
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${scoreColor(res.overallScore)}`}>{res.overallScore}</div>
              <div className="text-sm leading-tight text-zinc-300">{res.summary}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">✓ Onde foi bem ({res.strengths.length})</h3>
                <div className="mt-2 space-y-2">
                  {res.strengths.map((s,i)=>(
                    <div key={i} className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-3">
                      <div className="text-sm font-medium text-emerald-200">{s.title}</div>
                      <div className="mt-1 text-xs italic text-zinc-400">“{s.evidence}”</div>
                      <div className="mt-1 text-xs text-zinc-500">{s.whyGood}</div>
                    </div>
                  ))}
                  {res.strengths.length===0 && <p className="text-xs text-zinc-500">Nenhum destaque positivo detectado.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400">⚠ Atenção & melhoria ({res.improvements.length})</h3>
                <div className="mt-2 space-y-2">
                  {res.improvements.map((s,i)=>(
                    <div key={i} className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-3">
                      <div className="flex items-center gap-2"><span className="text-sm font-medium text-amber-200">{s.title}</span><Badge className={s.severity==="high"?"bg-red-600":s.severity==="medium"?"bg-amber-600":"bg-zinc-700"}>{s.severity}</Badge></div>
                      <div className="mt-1 text-xs italic text-zinc-400">“{s.evidence}”</div>
                      <div className="mt-1 text-xs text-sky-300">→ {s.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {res.decisiveMoments.length>0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Momentos decisivos</h3>
                <div className="mt-2 space-y-2">
                  {res.decisiveMoments.map((m,i)=>(
                    <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="text-xs text-zinc-500">Prospect:</div><div className="text-sm italic text-zinc-200">“{m.prospectStatement}”</div>
                      <div className="mt-1 text-xs text-red-300">Perdeu: {m.whatWasMissed}</div>
                      <div className="mt-1 text-xs text-sky-300">Pergunte: {m.recommendedQuestion}</div>
                      <div className="mt-1 text-xs text-zinc-500">Impacto: {m.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Roleplays recomendados para treinar</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {res.recommendedRoleplays.map((r,i)=>(
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="text-sm font-medium text-zinc-100">{r.title}</div>
                    <div className="mt-1 flex gap-2 text-xs"><Badge>{r.difficulty}</Badge><span className="text-zinc-500">{r.trainingObjective}</span></div>
                    <div className="mt-2 text-xs text-zinc-400">{r.reason}</div>
                    <div className="mt-2 flex gap-2">
                      {r.scenarioId ? <Link href={`/roleplay/${r.scenarioId}`}><Button size="sm" variant="outline">Treinar</Button></Link> : <Link href="/roleplay"><Button size="sm" variant="outline">Ver roleplays</Button></Link>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {res.nextSteps.length>0 && (
              <div className="rounded-lg bg-zinc-950 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Próximos passos</h3>
                <ul className="mt-2 list-disc pl-4 text-sm text-zinc-300">{res.nextSteps.map((n,i)=><li key={i}>{n}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AgentsClient({ initialPending, agents, stats, recent }:{ initialPending:{id:string,type:string,title:string,reason:string|null,createdAt:string,payload:unknown}[], agents:Record<string,{name:string,desc:string,trigger:string,risk:string}>, stats:{deals:number,calls:number,pending:number}, recent:{action:string,createdAt:string}[] }){
  const [pending,setPending]=useState(initialPending);
  const [msg,setMsg]=useState<string|null>(null);
  async function approve(id:string){
    const r=await fetch(`/api/approvals/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve"})});
    if(r.ok) setPending(p=>p.filter(x=>x.id!==id));
    setMsg("Aprovado ✓ — ação executada");
  }
  async function reject(id:string){
    const r=await fetch(`/api/approvals/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reject"})});
    if(r.ok) setPending(p=>p.filter(x=>x.id!==id));
    setMsg("Rejeitado");
  }
  async function runAgents(){
    setMsg("Rodando agentes...");
    const r=await fetch("/api/agents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trigger:"call.completed",payload:{}})});
    const j=await r.json().catch(()=>({}));
    setMsg(j.ran?`Rodou ${j.ran.length} agentes`:"Nada para rodar — crie calls/deals");
    setTimeout(()=>location.reload(),800);
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(agents).map(([k,a])=>(
          <Card key={k} className="border-zinc-800">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2">{a.name} <Badge>{a.risk}</Badge></CardTitle><p className="text-xs text-zinc-500">{a.desc}</p><p className="text-xs text-zinc-600">trigger: {a.trigger}</p></CardHeader>
            <CardContent><p className="text-xs text-zinc-400">Autônomo em baixa confiança? Pede aprovação. Alta confiança? Executa e loga.</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Fila de aprovações — HITL ({pending.length}) • {stats.deals} deals • {stats.calls} calls</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {msg && <p className="text-xs text-amber-400">{msg}</p>}
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={runAgents}>Rodar agentes agora</Button><Button size="sm" variant="ghost" onClick={()=>location.reload()}>Atualizar fila</Button></div>
          {pending.length===0 && <p className="text-sm text-zinc-500">Nenhuma aprovação pendente. Agentes estão cuidando da higiene automaticamente.</p>}
          {pending.map(p=>(
            <div key={p.id} className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div><div className="flex gap-2"><Badge>{p.type}</Badge><span className="text-xs text-zinc-500">{new Date(p.createdAt).toLocaleString("pt-BR")}</span></div><div className="mt-1 text-sm text-zinc-100">{p.title}</div><div className="text-xs text-zinc-500">{p.reason}</div></div>
              <div className="flex gap-2"><Button size="sm" onClick={()=>approve(p.id)}>Aprovar</Button><Button size="sm" variant="outline" onClick={()=>reject(p.id)}>Rejeitar</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recente</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs text-zinc-500">{recent.length===0 && <p>Nenhum log ainda.</p>}{recent.map((r,i)=><div key={i} className="flex justify-between"><span>{r.action}</span><span>{new Date(r.createdAt).toLocaleString("pt-BR")}</span></div>)}</CardContent>
      </Card>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function calc(input:{leads:number,ticket:number,currentRate:number,improvedRate:number,investment:number}){
  const cur = input.leads*(input.currentRate/100)*input.ticket;
  const imp = input.leads*(input.improvedRate/100)*input.ticket;
  const uplift = imp-cur;
  const scenarios = { CONSERVATIVE:0.7, BASE:1, OPTIMISTIC:1.3 } as const;
  return Object.entries(scenarios).map(([k,m])=>{
    const u = uplift*m;
    const annual = u*12;
    const roi = input.investment>0 ? ((annual-input.investment)/input.investment*100) : 0;
    const payback = u>0 ? input.investment/u : null;
    return { scenario:k, monthly:u, annual, roi, payback };
  });
}

export function RoiCalculator({ deals }:{ deals:{id:string,name:string}[]}){
  const [form,setForm]=useState({dealId:deals[0]?.id??"",leads:"100",ticket:"5000",currentRate:"10",improvedRate:"18",investment:"30000"});
  const [res,setRes]=useState<ReturnType<typeof calc>|null>(null);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  function onCalc(){
    const inp={leads:Number(form.leads),ticket:Number(form.ticket),currentRate:Number(form.currentRate),improvedRate:Number(form.improvedRate),investment:Number(form.investment)};
    setRes(calc(inp));
  }
  async function onSave(){
    if(!res || !form.dealId){ setMsg("Selecione deal e calcule"); return; }
    setSaving(true); setMsg(null);
    const payload={dealId:form.dealId,inputs:{leads:Number(form.leads),ticket:Number(form.ticket),currentRate:Number(form.currentRate),improvedRate:Number(form.improvedRate),investment:Number(form.investment)},scenarios:res};
    const r=await fetch("/api/roi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const j=await r.json().catch(()=>({}));
    setSaving(false);
    if(!r.ok){ setMsg(JSON.stringify(j.error??j)); return; }
    setMsg("ROI salvo ✓"); setTimeout(()=>location.reload(),600);
  }
  const fmt=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
  return (
    <Card>
      <CardHeader><CardTitle>Calculadora ROI</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {deals.length>0 && <div className="space-y-1.5"><Label>Deal</Label><select value={form.dealId} onChange={e=>setForm({...form,dealId:e.target.value})} className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm">{deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
        {!deals.length && <p className="text-sm text-amber-400">Crie um deal primeiro para salvar.</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Leads/mês</Label><Input value={form.leads} onChange={e=>setForm({...form,leads:e.target.value})} type="number" /></div>
          <div className="space-y-1.5"><Label>Ticket (R$)</Label><Input value={form.ticket} onChange={e=>setForm({...form,ticket:e.target.value})} type="number" /></div>
          <div className="space-y-1.5"><Label>Taxa atual %</Label><Input value={form.currentRate} onChange={e=>setForm({...form,currentRate:e.target.value})} type="number" /></div>
          <div className="space-y-1.5"><Label>Taxa melhorada %</Label><Input value={form.improvedRate} onChange={e=>setForm({...form,improvedRate:e.target.value})} type="number" /></div>
          <div className="space-y-1.5 col-span-2"><Label>Investimento (R$)</Label><Input value={form.investment} onChange={e=>setForm({...form,investment:e.target.value})} type="number" /></div>
        </div>
        <div className="flex gap-2"><Button onClick={onCalc} type="button">Calcular</Button><Button onClick={onSave} disabled={saving || !res} variant="outline" type="button">{saving?"Salvando...":"Salvar ROI"}</Button></div>
        {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        {res && <div className="grid gap-3 sm:grid-cols-3">
          {res.map(r=>(
            <div key={r.scenario} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{r.scenario}</div>
              <div className="mt-1 text-sm">Mensal: <b className="text-emerald-400">{fmt(r.monthly)}</b></div>
              <div className="text-sm">Anual: <b>{fmt(r.annual)}</b></div>
              <div className="text-sm">ROI: <b>{r.roi.toFixed(1)}%</b></div>
              <div className="text-xs text-zinc-500">Payback: {r.payback ? `${r.payback.toFixed(1)} meses` : "—"}</div>
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  );
}

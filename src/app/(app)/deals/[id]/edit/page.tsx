"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [fetchErr,setFetchErr]=useState<string|null>(null);
  const [initial,setInitial]=useState<Record<string,string>|null>(null);
  const [companies,setCompanies]=useState<{id:string,name:string}[]>([]);
  const [contacts,setContacts]=useState<{id:string,name:string,companyId:string}[]>([]);
  const [companyId,setCompanyId]=useState("");

  useEffect(()=>{ fetch("/api/companies?limit=100").then(r=>r.json()).then(j=>setCompanies(j.items ?? [])).catch(()=>{}); },[]);
  useEffect(()=>{
    fetch(`/api/deals/${id}`).then(r=>r.json()).then(j=>{
      if(j.error){ setFetchErr(String(j.error)); return; }
      const toDate = (v:string|null) => v ? v.slice(0,10) : "";
      setInitial({
        companyId: j.companyId ?? j.company?.id ?? "",
        primaryContactId: j.primaryContactId ?? "",
        name: j.name ?? "",
        stage: j.stage ?? "LEAD",
        value: j.value != null ? String(j.value) : "",
        currency: j.currency ?? "BRL",
        probability: j.probability != null ? String(j.probability) : "",
        expectedCloseDate: toDate(j.expectedCloseDate),
        source: j.source ?? "",
        painSummary: j.painSummary ?? "",
        urgency: j.urgency ?? "",
        nextStep: j.nextStep ?? "",
        nextStepDate: toDate(j.nextStepDate),
        currentSolution: j.currentSolution ?? "",
        desiredOutcome: j.desiredOutcome ?? "",
        decisionProcess: j.decisionProcess ?? "",
        decisionCriteria: j.decisionCriteria ?? "",
        lostReason: j.lostReason ?? "",
      });
      setCompanyId(j.companyId ?? j.company?.id ?? "");
    }).catch(e=>setFetchErr(String(e)));
  },[id]);
  useEffect(()=>{
    if(!companyId) return;
    fetch(`/api/contacts?companyId=${companyId}&limit=100`).then(r=>r.json()).then(j=>setContacts(j.items ?? [])).catch(()=>{});
  },[companyId]);

  async function onSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body:any=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    for(const k of ["value","probability","primaryContactId","expectedCloseDate","nextStepDate"]) if(!body[k]) delete body[k];
    for(const k of Object.keys(body)) if(body[k]==="") delete body[k];
    const res=await fetch(`/api/deals/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push(`/deals/${id}`); router.refresh();
  }
  async function onDelete(){
    if(!confirm("Excluir deal?")) return;
    const res=await fetch(`/api/deals/${id}`,{method:"DELETE"});
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(JSON.stringify(j.error ?? j)); return; }
    router.push("/deals"); router.refresh();
  }
  if(fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if(!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Editar deal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Empresa *</Label>
              <select name="companyId" required value={companyId} onChange={e=>setCompanyId(e.target.value)} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">Selecione...</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Contato principal</Label>
              <select name="primaryContactId" defaultValue={initial.primaryContactId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem contato —</option>
                {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Nome do deal *</Label><Input name="name" required defaultValue={initial.name} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Stage</Label>
                <select name="stage" defaultValue={initial.stage} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                  {["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Valor (BRL)</Label><Input name="value" type="number" min="0" step="100" defaultValue={initial.value} /></div>
              <div className="space-y-1.5"><Label>Prob. %</Label><Input name="probability" type="number" min="0" max="100" defaultValue={initial.probability} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Expected close</Label><Input name="expectedCloseDate" type="date" defaultValue={initial.expectedCloseDate} /></div>
              <div className="space-y-1.5"><Label>Origem</Label><Input name="source" defaultValue={initial.source} /></div>
            </div>
            <div className="space-y-1.5"><Label>Pain summary</Label><Textarea name="painSummary" rows={2} defaultValue={initial.painSummary} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Urgência</Label><Input name="urgency" defaultValue={initial.urgency} /></div>
              <div className="space-y-1.5"><Label>Next step</Label><Input name="nextStep" defaultValue={initial.nextStep} /></div>
            </div>
            <div className="space-y-1.5"><Label>Next step date</Label><Input name="nextStepDate" type="date" defaultValue={initial.nextStepDate} /></div>
            <div className="space-y-1.5"><Label>Current solution</Label><Textarea name="currentSolution" rows={2} defaultValue={initial.currentSolution} /></div>
            <div className="space-y-1.5"><Label>Desired outcome</Label><Textarea name="desiredOutcome" rows={2} defaultValue={initial.desiredOutcome} /></div>
            <div className="space-y-1.5"><Label>Decision process</Label><Textarea name="decisionProcess" rows={2} defaultValue={initial.decisionProcess} /></div>
            <div className="space-y-1.5"><Label>Decision criteria</Label><Textarea name="decisionCriteria" rows={2} defaultValue={initial.decisionCriteria} /></div>
            <div className="space-y-1.5"><Label>Lost reason</Label><Input name="lostReason" defaultValue={initial.lostReason} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir deal</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

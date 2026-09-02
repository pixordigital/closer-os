"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NewDealForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [companies, setCompanies]=useState<{id:string,name:string}[]>([]);
  const [contacts, setContacts]=useState<{id:string,name:string,companyId:string}[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [companyId, setCompanyId]=useState(sp.get("companyId") ?? "");

  useEffect(()=>{ fetch("/api/companies?limit=100").then(r=>r.json()).then(j=>setCompanies(j.items ?? [])).catch(()=>{}); },[]);
  useEffect(()=>{ if(!companyId) return; fetch(`/api/contacts?companyId=${companyId}&limit=100`).then(r=>r.json()).then(j=>setContacts(j.items ?? [])).catch(()=>{}); },[companyId]);

  async function onSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const raw=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    const body:any={...raw};
    if(!body.value) delete body.value;
    if(!body.probability) delete body.probability;
    if(!body.primaryContactId) delete body.primaryContactId;
    if(!body.expectedCloseDate) delete body.expectedCloseDate;
    if(!body.nextStepDate) delete body.nextStepDate;
    for(const k of Object.keys(body)) if(body[k]==="") delete body[k];
    const res=await fetch("/api/deals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push(`/deals/${j.id}`); router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Novo deal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Empresa *</Label>
              <select name="companyId" required value={companyId} onChange={e=>setCompanyId(e.target.value)} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">Selecione...</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Contato principal</Label>
              <select name="primaryContactId" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem contato —</option>
                {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Nome do deal *</Label><Input name="name" required placeholder="Ex: Acme — Automação Comercial" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Stage</Label>
                <select name="stage" defaultValue="LEAD" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                  {["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Valor (BRL)</Label><Input name="value" type="number" min="0" step="100" placeholder="45000" /></div>
              <div className="space-y-1.5"><Label>Prob. %</Label><Input name="probability" type="number" min="0" max="100" placeholder="30" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Expected close</Label><Input name="expectedCloseDate" type="date" /></div>
              <div className="space-y-1.5"><Label>Origem</Label><Input name="source" placeholder="Indicação, Inbound..." /></div>
            </div>
            <div className="space-y-1.5"><Label>Pain summary</Label><Textarea name="painSummary" rows={2} placeholder="Dor principal do prospect..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Urgência</Label><Input name="urgency" placeholder="Alta / Média / Baixa" /></div>
              <div className="space-y-1.5"><Label>Next step</Label><Input name="nextStep" placeholder="Enviar proposta até sexta" /></div>
            </div>
            <div className="space-y-1.5"><Label>Next step date</Label><Input name="nextStepDate" type="date" /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Criar deal"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewDealPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Carregando...</div>}><NewDealForm /></Suspense>;
}

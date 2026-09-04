"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Record<string,string>|null>(null);
  const [fetchErr, setFetchErr] = useState<string|null>(null);
  const [companies, setCompanies] = useState<{id:string,name:string}[]>([]);

  useEffect(()=>{ fetch("/api/companies?limit=100").then(r=>r.json()).then(j=>setCompanies(j.items ?? [])).catch(()=>{}); },[]);
  useEffect(()=>{
    fetch(`/api/contacts/${id}`).then(r=>r.json()).then(j=>{
      if(j.error){ setFetchErr(String(j.error)); return; }
      setInitial({ companyId:j.companyId??"", name:j.name??"", role:j.role??"", email:j.email??"", phone:j.phone??"", linkedinUrl:j.linkedinUrl??"", decisionRole:j.decisionRole??"UNKNOWN", consentAt: j.consentAt ? String(j.consentAt).slice(0,10) : "", consentSource: j.consentSource ?? "", notes:j.notes??"" });
    }).catch(e=>setFetchErr(String(e)));
  },[id]);

  async function onSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body:Record<string,string>={};
    for(const [k,v] of fd.entries()){ const s=(v as string).trim(); if(s) body[k]=s; }
    const res=await fetch(`/api/contacts/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push(`/contacts/${id}`); router.refresh();
  }
  async function onDelete(){
    if(!confirm("Excluir contato?")) return;
    const res=await fetch(`/api/contacts/${id}`,{method:"DELETE"});
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(JSON.stringify(j.error ?? j)); return; }
    router.push("/contacts"); router.refresh();
  }
  if(fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if(!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Editar contato</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Empresa</Label>
              <select name="companyId" defaultValue={initial.companyId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— selecione —</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required defaultValue={initial.name} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cargo/Papel</Label><Input name="role" defaultValue={initial.role} /></div>
              <div className="space-y-1.5"><Label>Decision role</Label>
                <select name="decisionRole" defaultValue={initial.decisionRole} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                  {["DECISION_MAKER","INFLUENCER","CHAMPION","USER","BLOCKER","UNKNOWN"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" defaultValue={initial.email} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input name="phone" defaultValue={initial.phone} /></div>
            </div>
            <div className="space-y-1.5"><Label>LinkedIn</Label><Input name="linkedinUrl" defaultValue={initial.linkedinUrl} placeholder="https://linkedin.com/in/..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Consent at</Label><Input name="consentAt" type="date" defaultValue={initial.consentAt ? String(initial.consentAt).slice(0,10) : ""} /></div>
              <div className="space-y-1.5"><Label>Consent source</Label><Input name="consentSource" defaultValue={initial.consentSource} placeholder="form, call" maxLength={80} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" defaultChecked={!!initial.consentAt} onChange={e=>{const el=document.querySelector<HTMLInputElement>('input[name="consentAt"]'); if(el) el.value = e.target.checked ? new Date().toISOString().slice(0,10) : "";}} /> LGPD consent</label>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notes" rows={3} defaultValue={initial.notes} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir contato</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

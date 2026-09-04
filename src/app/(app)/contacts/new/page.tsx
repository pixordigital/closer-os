"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NewContactForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [companies, setCompanies] = useState<{id:string,name:string}[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const presetCompanyId = sp.get("companyId") ?? "";

  useEffect(()=>{ fetch("/api/companies?limit=100").then(r=>r.json()).then(j=>setCompanies(j.items ?? [])).catch(()=>{}); },[]);

  async function onSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    for(const k of Object.keys(body)) if(!body[k]) delete body[k];
    const res=await fetch("/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push(`/contacts/${j.id}`); router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Novo contato</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Empresa *</Label>
              <select name="companyId" required defaultValue={presetCompanyId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">Selecione...</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cargo</Label><Input name="role" placeholder="CFO" /></div>
              <div className="space-y-1.5"><Label>Decision role</Label>
                <select name="decisionRole" className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                  {["UNKNOWN","DECISION_MAKER","INFLUENCER","CHAMPION","USER","BLOCKER"].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Telefone</Label><Input name="phone" /></div>
              <div className="space-y-1.5"><Label>LinkedIn</Label><Input name="linkedinUrl" placeholder="https://..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Consent at</Label><Input name="consentAt" type="date" /></div>
              <div className="space-y-1.5"><Label>Consent source</Label><Input name="consentSource" placeholder="form, call, import" maxLength={80} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" onChange={e=>{const el=document.querySelector<HTMLInputElement>('input[name="consentAt"]'); if(el) el.value = e.target.checked ? new Date().toISOString().slice(0,10) : "";}} /> LGPD consent agora</label>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Criar contato"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewContactPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Carregando...</div>}><NewContactForm /></Suspense>;
}

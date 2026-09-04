"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCompanyPage() {
  const router = useRouter();
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  async function onSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    for(const k of Object.keys(body)) if(!body[k]) delete body[k];
    const res=await fetch("/api/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){
      if(j.existingId) setErr(`${j.error ?? "Duplicata"} — já existe: /companies/${j.existingId}`);
      else setErr(JSON.stringify(j.error ?? j, null, 2));
      return;
    }
    router.push(`/companies/${j.id}`); router.refresh();
  }
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Nova empresa</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required placeholder="Acme SaaS" /></div>
            <div className="space-y-1.5"><Label>CNPJ (opcional — dedupe)</Label><Input name="cnpj" placeholder="00.000.000/0000-00" maxLength={18} /></div>
            <div className="space-y-1.5"><Label>Website</Label><Input name="website" placeholder="https://acme.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Indústria</Label><Input name="industry" placeholder="SaaS" /></div>
              <div className="space-y-1.5"><Label>Porte</Label><Input name="companySize" placeholder="51-200" /></div>
            </div>
            <div className="space-y-1.5"><Label>Localização</Label><Input name="location" placeholder="São Paulo, SP" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" rows={3} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Criar empresa"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

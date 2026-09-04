"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Record<string, string> | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/companies/${id}`).then(r => r.json()).then(j => {
      if (j.error) { setFetchErr(String(j.error)); return; }
      setInitial({
        name: j.name ?? "", website: j.website ?? "", industry: j.industry ?? "",
        companySize: j.companySize ?? "", location: j.location ?? "",
        cnpj: j.cnpj ?? "", description: j.description ?? "", notes: j.notes ?? "",
      });
    }).catch(e => setFetchErr(String(e)));
  }, [id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string,string> = {};
    for (const [k,v] of fd.entries()) { const s=(v as string).trim(); if(s) body[k]=s; }
    const res = await fetch(`/api/companies/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push(`/companies/${id}`); router.refresh();
  }
  async function onDelete(){
    if(!confirm("Excluir empresa? Deals e contacts vinculados impedem exclusão.")) return;
    const res = await fetch(`/api/companies/${id}`, { method:"DELETE" });
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(JSON.stringify(j.error ?? j)); return; }
    router.push("/companies"); router.refresh();
  }
  if (fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if (!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Editar empresa</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required defaultValue={initial.name} /></div>
            <div className="space-y-1.5"><Label>CNPJ (dedupe)</Label><Input name="cnpj" defaultValue={initial.cnpj} placeholder="00.000.000/0000-00" maxLength={18} /></div>
            <div className="space-y-1.5"><Label>Website</Label><Input name="website" defaultValue={initial.website} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Indústria</Label><Input name="industry" defaultValue={initial.industry} /></div>
              <div className="space-y-1.5"><Label>Porte</Label><Input name="companySize" defaultValue={initial.companySize} /></div>
            </div>
            <div className="space-y-1.5"><Label>Localização</Label><Input name="location" defaultValue={initial.location} /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={initial.description} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notes" rows={2} defaultValue={initial.notes} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir empresa</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

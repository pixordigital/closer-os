"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditProductPage(){
  const { id } = useParams<{id:string}>();
  const router=useRouter();
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [initial,setInitial]=useState<Record<string,string>|null>(null);
  const [fetchErr,setFetchErr]=useState<string|null>(null);
  useEffect(()=>{
    fetch(`/api/products/${id}`).then(r=>r.json()).then(j=>{
      if(j.error){ setFetchErr(String(j.error)); return; }
      setInitial({ name:j.name??"", sku:j.sku??"", price:j.price!=null?String(j.price):"", currency:j.currency??"BRL", description:j.description??"", active: String(!!j.active) });
    }).catch(e=>setFetchErr(String(e)));
  },[id]);
  async function onSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body:any=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    for(const k of Object.keys(body)) if(!body[k]) delete body[k];
    body.active = body.active==="true"||body.active==="on"||body.active==="1";
    const res=await fetch(`/api/products/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({})); setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push("/products"); router.refresh();
  }
  async function onDelete(){
    if(!confirm("Excluir produto?")) return;
    const res=await fetch(`/api/products/${id}`,{method:"DELETE"});
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(JSON.stringify(j.error??j)); return; }
    router.push("/products"); router.refresh();
  }
  if(fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if(!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card><CardHeader><CardTitle>Editar produto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required defaultValue={initial.name} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>SKU</Label><Input name="sku" defaultValue={initial.sku} maxLength={40} /></div>
              <div className="space-y-1.5"><Label>Preço *</Label><Input name="price" type="number" min="0" step="0.01" required defaultValue={initial.price} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Moeda</Label><Input name="currency" defaultValue={initial.currency} maxLength={3} /></div>
              <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300"><input type="checkbox" name="active" defaultChecked={initial.active==="true"} /> Ativo</label>
            </div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={initial.description} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

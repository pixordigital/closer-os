"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProductPage(){
  const router=useRouter();
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  async function onSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body:any=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    for(const k of Object.keys(body)) if(!body[k]) delete body[k];
    if(body.active) body.active = body.active==="true" || body.active==="on";
    const res=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push("/products"); router.refresh();
  }
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card><CardHeader><CardTitle>Novo produto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required placeholder="Closer OS Pro" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>SKU</Label><Input name="sku" placeholder="CLOSER-PRO" maxLength={40} /></div>
              <div className="space-y-1.5"><Label>Preço (BRL) *</Label><Input name="price" type="number" min="0" step="0.01" required placeholder="4970" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Moeda</Label><Input name="currency" defaultValue="BRL" maxLength={3} /></div>
              <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300"><input type="checkbox" name="active" defaultChecked /> Ativo</label>
            </div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" rows={3} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Criar produto"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

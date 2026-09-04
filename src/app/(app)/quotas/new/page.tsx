"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewQuotaPage(){
  const router=useRouter();
  const [members,setMembers]=useState<{id:string,name:string}[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{ fetch("/api/members").then(r=>r.json()).then(j=>setMembers((j.items??[]).map((m:{id:string;name:string})=>({id:m.id,name:m.name})))).catch(()=>{}); },[]);
  async function onSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body={ userId: String(fd.get("userId")??""), period: String(fd.get("period")??""), target: Number(fd.get("target")??0) };
    const res=await fetch("/api/quotas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push("/quotas?period="+encodeURIComponent(body.period)); router.refresh();
  }
  const defaultPeriod=new Date().toISOString().slice(0,7);
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card><CardHeader><CardTitle>Nova quota</CardTitle><p className="text-sm text-zinc-400">Meta mensal por closer — cruza com forecast em Reports</p></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Closer *</Label>
              <select name="userId" required className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">Selecione...</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Período (YYYY-MM) *</Label><Input name="period" required defaultValue={defaultPeriod} pattern="\d{4}-\d{2}" placeholder="2026-09" /></div>
              <div className="space-y-1.5"><Label>Meta (BRL) *</Label><Input name="target" type="number" required min="0" step="100" placeholder="80000" /></div>
            </div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Criar quota"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

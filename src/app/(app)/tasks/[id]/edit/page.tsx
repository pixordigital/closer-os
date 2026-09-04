"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [fetchErr,setFetchErr]=useState<string|null>(null);
  const [initial,setInitial]=useState<Record<string,string>|null>(null);
  const [deals,setDeals]=useState<{id:string,name:string}[]>([]);
  const [members,setMembers]=useState<{id:string,name:string}[]>([]);

  useEffect(()=>{ fetch("/api/deals?limit=100").then(r=>r.json()).then(j=>setDeals(j.items ?? [])).catch(()=>{}); },[]);
  useEffect(()=>{ fetch("/api/members").then(r=>r.json()).then(j=>setMembers(j.items ?? [])).catch(()=>{}); },[]);
  useEffect(()=>{
    fetch(`/api/tasks/${id}`).then(r=>r.json()).then(j=>{
      if(j.error){ setFetchErr(String(j.error)); return; }
      setInitial({ title:j.title??"", description:j.description??"", dealId:j.dealId??"", assigneeId:j.assigneeId??"", dueDate: j.dueDate ? String(j.dueDate).slice(0,10):"", status:j.status??"TODO" });
    }).catch(e=>setFetchErr(String(e)));
  },[id]);

  async function onSubmit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setErr(null); setLoading(true);
    const fd=new FormData(e.currentTarget);
    const body:any=Object.fromEntries([...fd.entries()].map(([k,v])=>[k,(v as string).trim()]));
    if(!body.dealId) delete body.dealId;
    if(!body.assigneeId) delete body.assigneeId;
    if(!body.dueDate) delete body.dueDate;
    if(!body.description) delete body.description;
    const res=await fetch(`/api/tasks/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await res.json().catch(()=>({}));
    setLoading(false);
    if(!res.ok){ setErr(JSON.stringify(j.error ?? j,null,2)); return; }
    router.push("/tasks"); router.refresh();
  }
  async function onDelete(){
    if(!confirm("Excluir task?")) return;
    const res=await fetch(`/api/tasks/${id}`,{method:"DELETE"});
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(JSON.stringify(j.error ?? j)); return; }
    router.push("/tasks"); router.refresh();
  }
  if(fetchErr) return <div className="p-8 text-sm text-red-400">{fetchErr}</div>;
  if(!initial) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>;
  return (
    <div className="mx-auto max-w-xl p-6 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Editar task</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required defaultValue={initial.title} /></div>
            <div className="space-y-1.5"><Label>Deal</Label>
              <select name="dealId" defaultValue={initial.dealId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem deal —</option>
                {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Responsável</Label>
              <select name="assigneeId" defaultValue={initial.assigneeId} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
                <option value="">— sem responsável —</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Status</Label>
                <select name="status" defaultValue={initial.status} className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100">
                  {["TODO","IN_PROGRESS","DONE","CANCELLED"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Vencimento</Label><Input name="dueDate" type="date" defaultValue={initial.dueDate} /></div>
            </div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={initial.description} /></div>
            {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
            <Button type="submit" disabled={loading} className="w-full">{loading?"Salvando...":"Salvar"}</Button>
            <Button type="button" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950" onClick={onDelete}>Excluir task</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

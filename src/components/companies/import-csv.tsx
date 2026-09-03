"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ImportCsv(){
  const [text,setText]=useState("name,website,industry\nAcme SaaS,https://acme.com,SaaS\nNordic Log,https://nordic.com,Logística");
  const [msg,setMsg]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  async function go(){
    setLoading(true); setMsg(null);
    const lines=text.trim().split("\n");
    const header=lines[0].split(",").map(s=>s.trim().toLowerCase());
    const rows=lines.slice(1).map(l=>{
      const v=l.split(",").map(s=>s.trim());
      const o:Record<string,string>={};
      header.forEach((h,i)=>o[h]=v[i]??"");
      return { name:o.name, website:o.website, industry:o.industry };
    }).filter(r=>r.name);
    const r=await fetch("/api/companies/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows})});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setMsg(j.error??"Falha"); return; }
    setMsg(`Importado ${j.created} · ignorados ${j.skipped} — agentes vão higienizar`);
    setTimeout(()=>location.reload(),800);
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Import CSV — agente higieniza automaticamente</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={text} onChange={e=>setText(e.target.value)} rows={5} className="font-mono text-xs" />
        <Button size="sm" onClick={go} disabled={loading}>{loading?"Importando...":"Importar"}</Button>
        {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        <p className="text-xs text-zinc-500">Cole CSV com colunas name,website,industry — agente cria companies e depois sugere deals/contacts.</p>
      </CardContent>
    </Card>
  );
}

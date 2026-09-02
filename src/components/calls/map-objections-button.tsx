"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MapObjectionsButton({ callId }:{ callId:string }){
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  async function go(){
    setLoading(true); setMsg(null);
    const r=await fetch("/api/objections/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ callId })});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setMsg(j.error ?? "Falha"); return; }
    if((j.created?.length ?? 0)===0) setMsg("Nenhuma objeção detectada");
    else { setMsg(`Mapeado ${j.created.length} objeções ✓`); setTimeout(()=>location.reload(),600); }
  }
  return <div className="space-y-1"><Button size="sm" variant="outline" onClick={go} disabled={loading}>{loading?"Mapeando...":"Mapear objeções"}</Button>{msg && <p className="text-xs text-zinc-400">{msg}</p>}</div>;
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Transcriber({ calls, deals, onDone }:{ calls:{id:string,title:string}[], deals:{id:string,name:string}[], onDone?:()=>void }){
  const [text,setText]=useState("");
  const [callId,setCallId]=useState(calls[0]?.id??"");
  const [dealId,setDealId]=useState(deals[0]?.id??"");
  const [file,setFile]=useState<File|null>(null);
  const [out,setOut]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);

  async function doTranscribe(){
    setLoading(true); setMsg(null);
    if(file && !text.trim()){
      const fd=new FormData(); fd.append("file", file);
      const r=await fetch("/api/objections/transcribe",{method:"POST", body:fd});
      const j=await r.json().catch(()=>({}));
      setLoading(false);
      if(!r.ok){ setMsg(j.error ?? "Falha transcrição"); return; }
      setOut(j.transcript); setText(j.transcript);
      setMsg("Transcrito ✓ — revise e clique Mapear");
      return;
    }
    setOut(text); setLoading(false); setMsg("Texto pronto para mapear");
  }

  async function doMap(){
    const transcript = (out ?? text).trim();
    if(!transcript){ setMsg("Cole transcript ou transcreva áudio"); return; }
    setLoading(true); setMsg(null);
    const r=await fetch("/api/objections/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ callId: callId||null, dealId: dealId||null, transcript })});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setMsg(j.error ?? "Falha mapeamento"); return; }
    if((j.created?.length ?? 0)===0) setMsg("Nenhuma objeção detectada — dicionário não alterado");
    else { setMsg(`Mapeado ${j.created.length} objeções ✓`); onDone?.(); setTimeout(()=>location.reload(),700); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Transcrever call → mapear objeções automaticamente</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Call (opcional)</Label><select value={callId} onChange={e=>setCallId(e.target.value)} className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"><option value="">— sem call —</option>{calls.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Deal (opcional)</Label><select value={dealId} onChange={e=>setDealId(e.target.value)} className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"><option value="">— sem deal —</option>{deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        </div>
        <div className="space-y-1.5"><Label>Áudio (mp3/wav/m4a) — Whisper se OPENAI_API_KEY setado</Label><Input type="file" accept="audio/*" onChange={e=>setFile(e.target.files?.[0] ?? null)} /></div>
        <div className="space-y-1.5"><Label>Transcript — cole texto ou use áudio acima</Label><Textarea value={text} onChange={e=>setText(e.target.value)} rows={5} placeholder="Cole aqui a transcrição da call..." /></div>
        <div className="flex gap-2"><Button size="sm" onClick={doTranscribe} disabled={loading} variant="outline">{loading?"...":"Transcrever"}</Button><Button size="sm" onClick={doMap} disabled={loading}>Mapear objeções</Button></div>
        {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        {out && <div className="rounded bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-40 overflow-auto">{out.slice(0,1200)}</div>}
      </CardContent>
    </Card>
  );
}

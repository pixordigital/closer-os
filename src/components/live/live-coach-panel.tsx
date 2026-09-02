"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Seg = { id:number, speaker:"prospect"|"closer", text:string, ts:string, objection?:{cat:string,label:string}, coach?:{suggestion:string,question:string,ai?:string|null} };

export function LiveCoachPanel(){
  const [listening,setListening]=useState(false);
  const [segments,setSegments]=useState<Seg[]>([]);
  const [manual,setManual]=useState("");
  const [speaker,setSpeaker]=useState<"prospect"|"closer">("prospect");
  const recRef=useRef<unknown>(null);
  const idRef=useRef(0);

  async function analyze(text:string, sp:"prospect"|"closer"){
    const id=++idRef.current;
    const base:Seg={id, speaker:sp, text, ts:new Date().toLocaleTimeString("pt-BR")};
    if(sp==="closer"){ setSegments(s=>[base,...s].slice(0,60)); return; }
    try{
      const r=await fetch("/api/live-coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
      const j=await r.json();
      if(j.objection){
        base.objection=j.objection;
        base.coach={suggestion:j.playbook.suggestion, question:j.playbook.question, ai:j.ai};
      }
    }catch{}
    setSegments(s=>[base,...s].slice(0,60));
  }

  function toggleMic(){
    const SR = (window as unknown as { webkitSpeechRecognition?: unknown, SpeechRecognition?: unknown }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    if(!SR){ alert("Seu navegador não suporta Web Speech API. Use Chrome/Edge ou digite manualmente."); return; }
    if(listening){
      (recRef.current as unknown as { stop:()=>void })?.stop?.();
      setListening(false);
      return;
    }
    const rec = new (SR as unknown as new()=>{ continuous:boolean, interimResults:boolean, lang:string, onresult:(e:unknown)=>void, onend:()=>void, start:()=>void, stop:()=>void })();
    rec.continuous=true; rec.interimResults=false; rec.lang="pt-BR";
    rec.onresult=(e:unknown)=>{
      const ev=e as { results: { length:number, [k:number]:{0:{transcript:string}} } & Array<unknown> };
      const last=(ev.results as unknown as Array<{0:{transcript:string}}>)[ev.results.length-1];
      const txt=last?.[0]?.transcript?.trim();
      if(txt) analyze(txt, "prospect");
    };
    rec.onend=()=>{ if(listening) try{ rec.start(); }catch{} };
    try{ rec.start(); recRef.current=rec; setListening(true);}catch{}
  }

  useEffect(()=>()=>{ try{ (recRef.current as {stop?:()=>void})?.stop?.(); }catch{} },[]);

  const lastCoach = segments.find(s=>s.coach);
  const objections = segments.filter(s=>s.objection);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Live transcript — fala do prospect → coach em tempo real</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={toggleMic} variant={listening?"destructive":"default"}>{listening?"● Parar escuta":"▶ Iniciar escuta (mic)"}</Button>
              <select value={speaker} onChange={e=>setSpeaker(e.target.value as never)} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm">
                <option value="prospect">Prospect</option>
                <option value="closer">Closer (você)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Textarea value={manual} onChange={e=>setManual(e.target.value)} placeholder="Ou digite o que o prospect falou e pressione Enter..." rows={2} className="text-sm" onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); if(manual.trim()){ analyze(manual.trim(), speaker); setManual(""); } } }} />
              <Button size="sm" onClick={()=>{ if(manual.trim()){ analyze(manual.trim(), speaker); setManual(""); } }}>Enviar</Button>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-500">Mic usa Web Speech API (Chrome/Edge). Em Meet/Zoom com áudio do PC, deixe o mic captando saída ou digite manualmente para ver coach instantâneo.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Mapeamento da call ({segments.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-auto">
            {segments.length===0 && <p className="text-sm text-zinc-500">Nenhum segmento ainda. Inicie a escuta ou digite a primeira fala.</p>}
            {segments.map(s=>(
              <div key={s.id} className={`rounded-lg border px-3 py-2 ${s.speaker==="prospect"?"border-zinc-800 bg-zinc-900":"border-sky-900/40 bg-sky-950/20"} ${s.objection?"ring-1 ring-amber-500/40":""}`}>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500"><Badge>{s.speaker}</Badge><span>{s.ts}</span>{s.objection && <Badge className="bg-amber-600 text-white">{s.objection.label}</Badge>}</div>
                <div className="mt-1 text-sm text-zinc-100">{s.text}</div>
                {s.coach && <div className="mt-2 rounded bg-amber-950/30 p-2 text-xs leading-relaxed"><div className="font-medium text-amber-300">Como contornar:</div><div className="text-zinc-200">{s.coach.ai ?? s.coach.suggestion}</div><div className="mt-1 text-sky-300">Pergunta: {s.coach.question}</div></div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card className={lastCoach ? "border-amber-700/50" : ""}>
          <CardHeader className="py-3"><CardTitle className="text-sm">Coach ao vivo</CardTitle></CardHeader>
          <CardContent>
            {!lastCoach && <p className="text-sm text-zinc-500">Aguardando objeção... Fale ou digite o que o prospect disse.</p>}
            {lastCoach?.coach && (
              <div className="space-y-3">
                <div className="flex gap-2"><Badge className="bg-amber-600">{lastCoach.objection?.label}</Badge><span className="text-xs text-zinc-500">{lastCoach.ts}</span></div>
                <div className="rounded-lg bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-100">{lastCoach.coach.ai ?? lastCoach.coach.suggestion}</div>
                <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-3 text-sm text-sky-200">→ {lastCoach.coach.question}</div>
                <Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(`${lastCoach.coach?.ai ?? lastCoach.coach?.suggestion ?? ""} ${lastCoach.coach?.question ?? ""}`)}>Copiar</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Objeções mapeadas ({objections.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-[280px] overflow-auto">
            {objections.length===0 && <p className="text-xs text-zinc-500">Nenhuma objeção detectada ainda.</p>}
            {objections.map(o=><div key={o.id} className="flex items-center justify-between rounded bg-zinc-900 px-2 py-1.5 text-xs"><span className="text-zinc-300">{o.text.slice(0,60)}</span><Badge>{o.objection?.label}</Badge></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-xs leading-relaxed text-zinc-400">
            Dicas: mantenha Meet/Zoom no iframe ao lado e deixe este painel aberto. O coach reage em &lt;500ms após cada fala do prospect. Combine com captura de áudio do sistema para transcrição automática total.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

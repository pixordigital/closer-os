"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type Seg = { id:number, speaker:"prospect"|"closer", text:string, ts:string, objection?:{cat:string,label:string}, coach?:{suggestion:string,question:string,ai?:string|null} };
type Perf = { overallScore:number, summary:string, strengths:{title:string}[], improvements:{title:string}[], recommendedRoleplays:{title:string,difficulty:string,scenarioId:string|null}[] };

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
  const [perf,setPerf]=useState<Perf|null>(null);
  const [perfLoading,setPerfLoading]=useState(false);
  const [perfErr,setPerfErr]=useState<string|null>(null);
  const [stealth,setStealth]=useState(false);
  const [stealthRec,setStealthRec]=useState<MediaRecorder|null>(null);
  const [stealthStatus,setStealthStatus]=useState<string|null>(null);

  function transcriptText(){ return segments.slice().reverse().map(s=>`${s.speaker}: ${s.text}`).join("\n").slice(0,12000); }

  async function analyzePerformance(save:boolean){
    const txt=transcriptText();
    if(txt.length<40){ setPerfErr("Grave pelo menos 2-3 falas antes"); return; }
    setPerfLoading(true); setPerfErr(null);
    const r=await fetch("/api/live/performance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ transcript: txt, provider:"meet", saveAsCall: save, title: save? `Video Call ${new Date().toLocaleString("pt-BR")}`: undefined })});
    const j=await r.json().catch(()=>({}));
    setPerfLoading(false);
    if(!r.ok){ setPerfErr(j.error ?? "Falha"); return; }
    setPerf(j as Perf);
    if(save && j.savedCallId){
      // auto-feed: hygiene + pipeline + outreach via agents, HITL will queue approvals
      await fetch("/api/agents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ trigger:"call.completed", payload:{ callId: j.savedCallId } })}).catch(()=>{});
      setPerfErr(`Salvo como call + agentes alimentaram sistema — veja /agents para aprovações`);
    }
  }

  async function toggleStealth(){
    if(stealth){
      stealthRec?.stop();
      setStealth(false); setStealthStatus("Stealth parado");
      return;
    }
    try{
      const stream=await (navigator.mediaDevices as unknown as {getDisplayMedia:(c:unknown)=>Promise<MediaStream>}).getDisplayMedia({ audio:true, video:false });
      const rec=new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      const chunks:BlobPart[]=[];
      rec.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); };
      rec.onstop=async()=>{
        const blob=new Blob(chunks, { type: rec.mimeType });
        setStealthStatus("Transcrevendo stealth via Whisper...");
        const fd=new FormData(); fd.append("file", blob, "stealth.webm");
        const r=await fetch("/api/live/transcribe",{method:"POST", body: fd});
        const j=await r.json().catch(()=>({}));
        if(r.ok && j.transcript){
          const lines=j.transcript.split(/(?<=[.!?])\s+/).slice(0,12);
          for(const l of lines){ if(l.trim()) await analyze(l.trim(), "prospect"); }
          setStealthStatus(`Stealth transcreveu ${lines.length} trechos — invisível ao prospect ✓`);
        } else setStealthStatus(j.error??"Falha stealth");
        stream.getTracks().forEach(t=>t.stop());
      };
      rec.start(2000);
      setStealthRec(rec); setStealth(true); setStealthStatus("Stealth ativo — capturando áudio da aba (Granola-style) invisível");
      setTimeout(()=>{ if(rec.state==="recording") rec.stop(); setStealth(false); }, 120000);
    }catch(e){ setStealthStatus(String(e).slice(0,200)); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Live transcript — stealth Granola (invisível) + mic</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={toggleMic} variant={listening?"destructive":"default"}>{listening?"● Parar escuta":"▶ Mic"}</Button>
              <Button size="sm" onClick={toggleStealth} variant={stealth?"destructive":"outline"}>{stealth?"● Parar stealth":"◉ Stealth (Granola) — invisível"}</Button>
              <select value={speaker} onChange={e=>setSpeaker(e.target.value as never)} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm">
                <option value="prospect">Prospect</option>
                <option value="closer">Closer (você)</option>
              </select>
            </div>
            {stealthStatus && <div className="rounded bg-zinc-950 p-2 text-xs text-amber-300">{stealthStatus}</div>}
            <div className="flex gap-2">
              <Textarea value={manual} onChange={e=>setManual(e.target.value)} placeholder="Ou digite o que o prospect falou e pressione Enter..." rows={2} className="text-sm" onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); if(manual.trim()){ analyze(manual.trim(), speaker); setManual(""); } } }} />
              <Button size="sm" onClick={()=>{ if(manual.trim()){ analyze(manual.trim(), speaker); setManual(""); } }}>Enviar</Button>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-500">Stealth: captura áudio da aba via getDisplayMedia → Whisper, sem bot visível (Granola-style). Mic usa Web Speech API. Ao finalizar, clique "Salvar como call + analisar" — agentes alimentam discovery/objeções/pipeline automaticamente e pedem aprovação em /agents quando precisa.</div>
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
          <CardHeader className="py-3"><CardTitle className="text-sm">Performance desta video call (mesmo agente das calls gravadas)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2"><Button size="sm" onClick={()=>analyzePerformance(false)} disabled={perfLoading||segments.length<2}>{perfLoading?"Analisando...":"Analisar agora"}</Button><Button size="sm" variant="outline" onClick={()=>analyzePerformance(true)} disabled={perfLoading||segments.length<2}>Salvar como call + analisar</Button></div>
            {perfErr && <p className="text-xs text-red-400">{perfErr}</p>}
            {!perf && <p className="text-xs text-zinc-500">Ao finalizar o Meet/Zoom, clique para o mesmo agente dizer onde foi bem, pontos de atenção e sugerir roleplays — igual a /calls/[id].</p>}
            {perf && (
              <div className="space-y-2">
                <div className="flex items-center gap-2"><span className={`text-xl font-bold ${perf.overallScore>=75?"text-emerald-400":perf.overallScore>=55?"text-amber-400":"text-red-400"}`}>{perf.overallScore}</span><span className="text-xs text-zinc-300">{perf.summary}</span></div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div><div className="font-medium text-emerald-400">✓ Foi bem</div><ul className="list-disc pl-4 text-zinc-400">{perf.strengths.slice(0,3).map((s,i)=><li key={i}>{s.title}</li>)}</ul></div>
                  <div><div className="font-medium text-amber-400">⚠ Melhorias</div><ul className="list-disc pl-4 text-zinc-400">{perf.improvements.slice(0,3).map((s,i)=><li key={i}>{s.title}</li>)}</ul></div>
                </div>
                <div className="flex flex-wrap gap-1.5">{perf.recommendedRoleplays.slice(0,3).map((r,i)=> r.scenarioId ? <Link key={i} href={`/roleplay/${r.scenarioId}`}><Badge className="bg-sky-600">{r.title}</Badge></Link> : <Badge key={i}>{r.title}</Badge>)}</div>
              </div>
            )}
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

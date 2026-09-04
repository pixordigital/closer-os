"use client";
import { useState } from "react";
export function EvolutionQuick(){
  const [instance,setInstance]=useState("");
  const [loading,setLoading]=useState(false);
  const [qr,setQr]=useState<string|null>(null);
  const [status,setStatus]=useState<string>("");
  async function create(){
    setLoading(true); setQr(null); setStatus("Criando instância...");
    const r=await fetch("/api/whatsapp/instance",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ instance: instance || undefined }) });
    const j=await r.json() as { instance:string; data: { qrcode?:{ base64?:string }; instance?:{ instanceName?:string } } };
    if(!r.ok){ setStatus("Erro: " + (j as {error?:string}).error); setLoading(false); return; }
    const b64=j.data?.qrcode?.base64 ?? (j.data as {base64?:string})?.base64;
    if(b64) setQr(b64);
    setInstance(j.instance);
    setStatus("Escaneie o QR no WhatsApp → Conectando...");
    setLoading(false);
    poll(j.instance);
  }
  async function poll(inst:string){
    for(let i=0;i<10;i++){
      await new Promise(r=>setTimeout(r,3000));
      const s=await fetch("/api/whatsapp/instance").then(x=>x.json()).catch(()=>null) as { statuses?: Array<{id:string;status:string}> }|null;
      const st=s?.statuses?.find(x=>x.id===inst)?.status;
      if(st){ setStatus(`Status: ${st}`); if(st==="open") break; }
    }
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">WhatsApp Evolution — Criação rápida</h3>
      <p className="text-xs text-zinc-500 mt-1">1 clique cria instância, mostra QR e conecta. 1 instância por closer (antiban).</p>
      <div className="mt-3 flex gap-2">
        <input value={instance} onChange={e=>setInstance(e.target.value)} placeholder="closer-meu-nome (opcional)" className="h-9 flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600" />
        <button onClick={create} disabled={loading} className="h-9 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{loading?"Criando...":"Criar + QR"}</button>
      </div>
      {status && <p className="mt-2 text-xs text-zinc-400">{status}</p>}
      {qr && <img src={qr} alt="QR Evolution" className="mt-3 h-64 w-64 rounded border border-zinc-800 bg-white p-2" />}
      <p className="mt-3 text-[11px] text-zinc-500">Dica: use chip com 14+ dias, aquecimento 30→600/dia, antiban já cuida do resto.</p>
    </div>
  );
}

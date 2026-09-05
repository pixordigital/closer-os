"use client";
import { useState } from "react";

export function BulkQuick(){
  const [text,setText]=useState("");
  const [numbers,setNumbers]=useState("");
  const [instance,setInstance]=useState("");
  const [sending,setSending]=useState(false);
  const [msg,setMsg]=useState("");
  async function send(){
    if(!text.trim()){ setMsg("Texto obrigatório"); return; }
    const nums=numbers.split(/[\n,; ]+/).map(s=>s.replace(/\D/g,"")).filter(s=>s.length>=10);
    if(nums.length===0){ setMsg("Informe números (um por linha, com 55)"); return; }
    setSending(true); setMsg("");
    const body:any={ text:text.trim(), numbers: nums };
    if(instance.trim()) body.instance=instance.trim();
    const r=await fetch("/api/whatsapp/bulk",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const j=await r.json().catch(()=>({}));
    setSending(false);
    if(!r.ok){ setMsg(j.error ?? "Falha"); return; }
    setMsg(`Fila: ${j.queued} · skip opt-out ${j.skippedOptout} · stagger ${j.staggerMs}ms · ~${j.estimateMin}min · inst ${j.instance}`);
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">Disparo em massa — antiban com stagger</h3>
      <p className="text-xs text-zinc-500">Distribui com stagger warmup-aware (cfg.maxPerMinute). Opt-out e antiban filtram auto. Máx 200/lote.</p>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Mensagem (spintax {olá|oi} + {{nome}} se usar items)" className="mt-3 w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100" />
      <input value={instance} onChange={e=>setInstance(e.target.value)} placeholder="Instância (vazio = auto menos usada)" className="mt-2 h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200" />
      <textarea value={numbers} onChange={e=>setNumbers(e.target.value)} rows={4} placeholder={"Números — um por linha ex:\n55...\n55..."} className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-zinc-200" />
      <button onClick={send} disabled={sending} className="mt-2 h-8 rounded bg-amber-600 px-3 text-xs font-medium text-white disabled:opacity-50">{sending?"Enfileirando...":"Enfileirar com antiban"}</button>
      {msg && <p className="mt-2 text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}

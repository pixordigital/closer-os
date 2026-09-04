"use client";
import { useState, useEffect } from "react";
export function EvolutionQuick(){
  const [instance,setInstance]=useState("");
  const [loading,setLoading]=useState(false);
  const [qr,setQr]=useState<string|null>(null);
  const [status,setStatus]=useState<string>("");
  const [list,setList]=useState<Array<{id:string;status:string}>>([]);
  const [edit,setEdit]=useState<Record<string,{webhookUrl:string; saving:boolean}>>({});
  async function load(){
    const s=await fetch("/api/whatsapp/instance").then(r=>r.json()).catch(()=>null) as { instances?:Array<{id:string}>; statuses?:Array<{id:string;status:string}> }|null;
    if(s?.statuses) setList(s.statuses);
  }
  useEffect(()=>{ load(); },[]);
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
    load();
  }
  async function poll(inst:string){
    for(let i=0;i<10;i++){
      await new Promise(r=>setTimeout(r,3000));
      const s=await fetch("/api/whatsapp/instance").then(x=>x.json()).catch(()=>null) as { statuses?: Array<{id:string;status:string}> }|null;
      const st=s?.statuses?.find(x=>x.id===inst)?.status;
      if(st){ setStatus(`Status: ${st}`); if(st==="open") break; }
    }
    load();
  }
  async function doEdit(id:string, action?:string){
    const e=edit[id];
    if(action){
      await fetch("/api/whatsapp/instance",{ method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ instance:id, action }) });
      setStatus(`${action} enviado para ${id}`); load();
      return;
    }
    if(!e?.webhookUrl) return;
    setEdit(s=>({ ...s, [id]:{ ...e, saving:true }}));
    await fetch("/api/whatsapp/instance",{ method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ instance:id, webhookUrl:e.webhookUrl }) });
    setStatus(`Webhook atualizado para ${id}`); setEdit(s=>({ ...s, [id]:{ ...e, saving:false }})); load();
  }
  async function del(id:string){
    if(!confirm(`Deletar instância ${id}?`)) return;
    await fetch(`/api/whatsapp/instance?instance=${id}`,{ method:"DELETE" });
    setStatus(`Deletada ${id}`); load();
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">WhatsApp Evolution — Criação rápida</h3>
      <p className="text-xs text-zinc-500 mt-1">1 clique cria, edita webhook/reinicia/desconecta/deleta. 1 instância por closer (antiban).</p>
      <div className="mt-3 flex gap-2">
        <input value={instance} onChange={e=>setInstance(e.target.value)} placeholder="closer-meu-nome (opcional)" className="h-9 flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600" />
        <button onClick={create} disabled={loading} className="h-9 rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{loading?"Criando...":"Criar + QR"}</button>
        <button onClick={load} className="h-9 rounded border border-zinc-700 px-3 text-xs text-zinc-300">Atualizar</button>
      </div>
      {status && <p className="mt-2 text-xs text-zinc-400">{status}</p>}
      {qr && <img src={qr} alt="QR Evolution" className="mt-3 h-64 w-64 rounded border border-zinc-800 bg-white p-2" />}
      {list.length>0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-zinc-300">Instâncias ({list.length}) — editar</div>
          {list.map(it=>(
            <div key={it.id} className="rounded border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-100">{it.id}</span><span className={`text-xs px-2 py-0.5 rounded ${it.status==="open"?"bg-emerald-900 text-emerald-300":"bg-zinc-800 text-zinc-400"}`}>{it.status}</span>
              </div>
              <div className="mt-2 flex gap-1">
                <input value={edit[it.id]?.webhookUrl ?? ""} onChange={e=>setEdit(s=>({ ...s, [it.id]:{ webhookUrl:e.target.value, saving:false }}))} placeholder="https://.../webhook (opcional)" className="h-8 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200" />
                <button onClick={()=>doEdit(it.id)} disabled={!!edit[it.id]?.saving} className="h-8 rounded bg-sky-600 px-2 text-xs text-white">Salvar webhook</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button onClick={()=>doEdit(it.id,"restart")} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">Reiniciar</button>
                <button onClick={()=>doEdit(it.id,"logout")} className="rounded border border-amber-700 px-2 py-1 text-xs text-amber-300">Desconectar</button>
                <button onClick={()=>del(it.id)} className="rounded border border-red-800 px-2 py-1 text-xs text-red-400">Deletar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">Dica: use chip com 14+ dias, aquecimento 30→600/dia, antiban já cuida do resto.</p>
    </div>
  );
}

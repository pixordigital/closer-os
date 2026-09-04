"use client";
import { useState } from "react";
export function GoogleQuick(){
  const [cal,setCal]=useState<string>("desconectado");
  const [gmail,setGmail]=useState<string>("desconectado");
  const [json,setJson]=useState("");
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  async function check(){
    const [c,g]=await Promise.all([
      fetch("/api/calendar/events").then(r=>r.json()).then(()=> "conectado").catch(()=> "desconectado"),
      fetch("/api/email/inbox?limit=1").then(r=>r.json()).then(()=> "conectado").catch(()=> "desconectado"),
    ]);
    setCal(c); setGmail(g);
  }
  async function saveCreds(){
    setSaving(true); setMsg("");
    try{
      const j=JSON.parse(json);
      const payload={ client_id: j.client_id ?? j.clientId, client_secret: j.client_secret ?? j.clientSecret, redirect_uris: j.redirect_uris ?? [j.redirectUri] };
      const r1=await fetch("/api/integrations",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider:"google-calendar", kind:"calendar", config: payload }) });
      const r2=await fetch("/api/integrations",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider:"gmail", kind:"email", config: payload }) });
      if(r1.ok && r2.ok) setMsg("Credenciais salvas — agora clique Conectar"); else setMsg("Erro ao salvar: "+await r1.text());
    }catch(e){ setMsg("JSON inválido — cole o arquivo do Google Cloud"); }
    setSaving(false);
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">Google — Calendar & Gmail 1-clique</h3>
      <p className="text-xs text-zinc-500 mt-1">Conecta OAuth uma vez, usa em Tasks, Follow-ups e Health. Antiban já respeita horário.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">📅 Calendar</span><span className={`text-xs ${cal==="conectado"?"text-emerald-400":"text-zinc-500"}`}>{cal}</span></div>
          <p className="text-xs text-zinc-500 mt-1">Tasks com dueDate viram evento + Meet link automático</p>
          <a href="/api/calendar/auth" className="mt-2 inline-block rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500">Conectar Calendar</a>
          <button onClick={check} className="ml-2 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Verificar</button>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">📧 Gmail</span><span className={`text-xs ${gmail==="conectado"?"text-emerald-400":"text-zinc-500"}`}>{gmail}</span></div>
          <p className="text-xs text-zinc-500 mt-1">Envio de Follow-up + leitura Inbox (HITL)</p>
          <a href="/api/gmail/auth" className="mt-2 inline-block rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500">Conectar Gmail</a>
          <button onClick={check} className="ml-2 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Verificar</button>
        </div>
      </div>
      <div className="mt-4 rounded border border-dashed border-zinc-700 p-3">
        <div className="text-xs font-medium text-zinc-300">Cole o JSON do Google Cloud (1x por org)</div>
        <textarea value={json} onChange={e=>setJson(e.target.value)} placeholder='{"client_id":"...","client_secret":"...","redirect_uris":["http://178.105.181.38:6002/api/calendar/callback"]}' className="mt-2 h-20 w-full rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-zinc-200" />
        <button onClick={saveCreds} disabled={saving || !json.trim()} className="mt-2 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">{saving?"Salvando...":"Salvar credenciais"}</button>
        {msg && <p className="mt-1 text-xs text-amber-400">{msg}</p>}
        <p className="mt-1 text-[11px] text-zinc-500">Ou configure env <code>GOOGLE_CALENDAR_CREDENTIALS</code> no Coolify. Salvar aqui grava por org.</p>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">Depois de salvar, clique Conectar. Callback em <code>/api/calendar/callback</code> e <code>/api/gmail/callback</code>.</p>
    </div>
  );
}

"use client";
import { useState } from "react";
export function GoogleQuick(){
  const [cal,setCal]=useState<string>("desconectado");
  const [gmail,setGmail]=useState<string>("desconectado");
  async function check(){
    const [c,g]=await Promise.all([
      fetch("/api/calendar/events").then(r=>r.json()).then(()=> "conectado").catch(()=> "desconectado"),
      fetch("/api/email/inbox?limit=1").then(r=>r.json()).then(()=> "conectado").catch(()=> "desconectado"),
    ]);
    setCal(c); setGmail(g);
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
      <p className="mt-3 text-[11px] text-zinc-500">Precisa: <code>GOOGLE_CALENDAR_CREDENTIALS</code> ou <code>GOOGLE_GMAIL_CREDENTIALS</code> JSON no .env (client_id/secret/redirect_uri). Depois 1 clique, sem código.</p>
    </div>
  );
}

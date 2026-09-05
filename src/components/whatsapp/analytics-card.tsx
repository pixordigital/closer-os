"use client";
import { useEffect, useState } from "react";

export function WhatsappAnalytics(){
  const [data,setData]=useState<Record<string,unknown>|null>(null);
  const [days,setDays]=useState(7);
  useEffect(()=>{
    fetch(`/api/whatsapp/analytics?days=${days}`).then(r=>r.json()).then(setData).catch(()=>{});
  },[days]);
  if(!data) return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-500">Carregando analytics…</div>;
  const byDay = (data.byDay as Array<Record<string,unknown>>) ?? [];
  const byInst = (data.byInstance as Array<Record<string,unknown>>) ?? [];
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">WhatsApp — Analytics / Warmup</h3>
        <select value={days} onChange={e=>setDays(Number(e.target.value))} className="h-7 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300">
          <option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option>
        </select>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded bg-zinc-950 p-3"><div className="text-lg font-semibold text-emerald-400">{String((data as Record<string,unknown>).totalSent ?? 0)}</div><div className="text-[11px] text-zinc-500">enviados</div></div>
        <div className="rounded bg-zinc-950 p-3"><div className="text-lg font-semibold text-sky-400">{String((data as Record<string,unknown>).totalInbound ?? 0)}</div><div className="text-[11px] text-zinc-500">inbound</div></div>
        <div className="rounded bg-zinc-950 p-3"><div className="text-lg font-semibold text-amber-400">{String((data as Record<string,unknown>).totalOptout ?? 0)}</div><div className="text-[11px] text-zinc-500">opt-out</div></div>
        <div className="rounded bg-zinc-950 p-3"><div className="text-lg font-semibold text-zinc-200">{String((data as Record<string,unknown>).pendingJobs ?? 0)}</div><div className="text-[11px] text-zinc-500">fila</div></div>
      </div>
      {byInst.length>0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-300">Instâncias — saúde / warmup</div>
          <div className="mt-2 space-y-2">
            {byInst.map((it)=>(
              <div key={String(it.instance)} className="rounded border border-zinc-800 bg-zinc-950 p-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-zinc-100">{String(it.instance)} <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${it.health==="healthy"?"bg-emerald-900 text-emerald-300":it.health==="offline"?"bg-red-900 text-red-300":"bg-amber-900 text-amber-300"}`}>{String(it.status)} · {String(it.health)}</span></div>
                  <div className="text-[11px] text-zinc-500">{String(it.ageDays)} dias · warmup {String(it.warmupPct)}% · {String(it.sentHour)}/{String(it.maxPerHour)}/h · {String(it.sentDay)}/{String(it.maxPerDay)}/dia · {String(it.maxPerMinute)}/min</div>
                </div>
                <div className="h-1.5 w-24 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width:`${it.warmupPct}%`}} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <div className="text-xs font-medium text-zinc-300">Por dia</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500"><tr><th className="text-left py-1 pr-2">Data</th><th className="text-right pr-2">Enviados</th><th className="text-right pr-2">Inbound</th><th className="text-right">Opt-out</th></tr></thead>
            <tbody>
              {byDay.map((r)=>(
                <tr key={String(r.date)} className="border-t border-zinc-800"><td className="py-1 pr-2 text-zinc-300">{String(r.date)}</td><td className="text-right pr-2 text-zinc-200">{String(r.sent)}</td><td className="text-right pr-2 text-sky-400">{String(r.inbound)}</td><td className="text-right text-amber-400">{String(r.optout)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

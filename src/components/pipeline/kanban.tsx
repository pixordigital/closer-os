"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const STAGES = [
  "LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST",
] as const;

const STAGE_LABEL: Record<string,string> = {
  LEAD:"Lead", QUALIFIED:"Qualified", DISCOVERY:"Discovery", SOLUTION:"Solution",
  PROPOSAL:"Proposal", NEGOTIATION:"Negotiation", VERBAL_COMMITMENT:"Verbal", WON:"Won", LOST:"Lost",
};
const STAGE_COLOR: Record<string,string> = {
  LEAD:"border-zinc-700", QUALIFIED:"border-sky-700", DISCOVERY:"border-violet-700",
  SOLUTION:"border-amber-700", PROPOSAL:"border-orange-700", NEGOTIATION:"border-red-700",
  VERBAL_COMMITMENT:"border-emerald-700", WON:"border-emerald-500", LOST:"border-zinc-800",
};

type Deal = {
  id:string; name:string; stage:string; value:number|null; currency:string;
  probability:number|null; nextStep:string|null; expectedCloseDate:string|null;
  company:{name:string}; primaryContact:{name:string}|null; health:number;
};

function fmtBRL(v:number|null) {
  if(v==null) return "—";
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL", maximumFractionDigits:0}).format(v);
}
function healthColor(s:number){ if(s>=75) return "text-emerald-400"; if(s>=45) return "text-amber-400"; return "text-red-400"; }
function healthBarColor(s:number){ if(s>=75) return "bg-emerald-500"; if(s>=45) return "bg-amber-500"; return "bg-red-500"; }

export function Kanban({ initialDeals }: { initialDeals: Deal[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function moveStage(id:string, stage:string) {
    let body: Record<string,string> = { stage };
    if (stage === "LOST") {
      const reason = window.prompt("Motivo da perda (obrigatório para LOST):");
      if (!reason || !reason.trim()) { alert("LOST exige motivo da perda."); return; }
      body.lostReason = reason.trim();
    }
    const prev = deals;
    setDeals(p => p.map(d => d.id===id ? {...d, stage}: d));
    const res = await fetch(`/api/deals/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    if(!res.ok) {
      const j = await res.json().catch(()=>({}) as {error?:string});
      const msg = typeof j.error === "string" ? j.error : (j as {error?:{formErrors?:string[]}})?.error?.formErrors?.join("; ") ?? "Falha ao mover deal";
      alert(msg);
      setDeals(prev);
      return;
    }
    startTransition(()=> router.refresh());
  }

  const byStage = STAGES.map(s => ({ stage:s, items: deals.filter(d=>d.stage===s)}));
  const totalValue = deals.reduce((a,d)=>a+(d.value??0),0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span>{deals.length} deals</span><span>·</span><span>{fmtBRL(totalValue)} total</span>
        {isPending && <span className="text-zinc-500">salvando…</span>}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {byStage.map(col => {
          const colValue = col.items.reduce((a,d)=>a+(d.value??0),0);
          return (
            <div key={col.stage} className={`flex w-[260px] shrink-0 flex-col rounded-lg border bg-zinc-900 ${STAGE_COLOR[col.stage]} `}>
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-200">{STAGE_LABEL[col.stage]}</span>
                <Badge>{col.items.length}</Badge>
              </div>
              <div className="px-2 py-1 text-[11px] text-zinc-500">{fmtBRL(colValue)}</div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {col.items.length===0 && <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">vazio</div>}
                {col.items.map(d=>(
                  <div key={d.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                    <Link href={`/deals/${d.id}`} className="block text-sm font-medium leading-tight text-zinc-100 hover:underline line-clamp-2">{d.name}</Link>
                    <div className="mt-1 text-xs text-zinc-400">{d.company.name}{d.primaryContact ? ` · ${d.primaryContact.name}`: ""}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200">{fmtBRL(d.value)}</span>
                      {d.probability!=null && <span className="text-zinc-500">{d.probability}%</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[11px] font-semibold ${healthColor(d.health)}`}>{d.health}%</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full ${healthBarColor(d.health)}`} style={{ width: `${d.health}%` }} /></div>
                    </div>
                    {d.nextStep && <div className="mt-1.5 truncate text-[11px] text-zinc-500">→ {d.nextStep}</div>}
                    {!d.nextStep && d.stage!=="WON" && d.stage!=="LOST" && <div className="mt-1.5 text-[11px] text-amber-500/80">sem next step</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <select
                        value={d.stage}
                        onChange={e=>moveStage(d.id, e.target.value)}
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300"
                      >
                        {STAGES.map(s=> <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS=[
  { k:"Nova empresa", h:"/companies/new" },
  { k:"Novo contato", h:"/contacts/new" },
  { k:"Novo deal", h:"/deals/new" },
  { k:"Nova call", h:"/calls/new" },
  { k:"Live Coach", h:"/live" },
  { k:"Objeções", h:"/objections" },
  { k:"Agentes", h:"/agents" },
  { k:"Pipeline", h:"/pipeline" },
  { k:"Hoje", h:"/today" },
  { k:"Dashboard", h:"/dashboard" },
];

export function CmdK(){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState("");
  const router=useRouter();
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); setOpen(o=>!o); }
      if(e.key==="Escape") setOpen(false);
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);
  if(!open) return null;
  const filtered=ACTIONS.filter(a=>a.k.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4" onClick={()=>setOpen(false)}>
      <div className="mt-20 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-4" onClick={e=>e.stopPropagation()}>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Digite ação... (Ctrl+K)" className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm outline-none" />
        <div className="mt-3 space-y-1 max-h-64 overflow-auto">
          {filtered.map(a=>(
            <button key={a.h} onClick={()=>{ setOpen(false); router.push(a.h); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-zinc-800 text-zinc-200">
              <span>{a.k}</span><span className="text-xs text-zinc-500">{a.h}</span>
            </button>
          ))}
          {filtered.length===0 && <p className="px-3 py-2 text-sm text-zinc-500">Nenhuma ação</p>}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Agentes autônomos cuidam do resto — você só aprova.</p>
      </div>
    </div>
  );
}

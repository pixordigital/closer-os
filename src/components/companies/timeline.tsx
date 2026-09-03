"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { type:string; date:string; title:string; href:string; meta?:string };
const ICON: Record<string,string> = { deal:"💼", call:"📞", task:"✓", follow_up:"✉️", contact:"👤" };

export function Timeline({ companyId }: { companyId:string }) {
  const [items, setItems] = useState<Item[]|null>(null);
  useEffect(()=>{ fetch(`/api/companies/${companyId}/timeline`).then(r=>r.json()).then(j=>setItems(j.items ?? [])).catch(()=>setItems([])); }, [companyId]);
  if (items===null) return <p className="text-sm text-zinc-500">Carregando timeline...</p>;
  if (items.length===0) return <p className="text-sm text-zinc-500">Sem histórico.</p>;
  return (
    <div className="space-y-2">
      {items.map((it,i)=>(
        <Link key={i} href={it.href} className="flex gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
          <span className="text-sm">{ICON[it.type] ?? "•"}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-100 truncate">{it.title}</div>
            {it.meta && <div className="text-xs text-zinc-500">{it.meta}</div>}
          </div>
          <span className="shrink-0 text-xs text-zinc-600">{new Date(it.date).toLocaleDateString("pt-BR")}</span>
        </Link>
      ))}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Tpl={ id:string; name:string; content:string; category?:string|null; isActive:boolean; };

export function TemplatesQuick(){
  const [items,setItems]=useState<Tpl[]>([]);
  const [name,setName]=useState(""); const [content,setContent]=useState(""); const [cat,setCat]=useState("");
  const [saving,setSaving]=useState(false); const [msg,setMsg]=useState("");
  async function load(){
    const j=await fetch("/api/whatsapp/templates").then(r=>r.json()).catch(()=>null) as { templates?:Tpl[]}|null;
    if(j?.templates) setItems(j.templates);
  }
  useEffect(()=>{ load(); },[]);
  async function create(){
    if(!name.trim()||!content.trim()){ setMsg("Nome e conteúdo obrigatórios"); return; }
    setSaving(true);
    const r=await fetch("/api/whatsapp/templates",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name:name.trim(), content:content.trim(), category:cat.trim()||null }) });
    const j=await r.json().catch(()=>({}));
    setSaving(false);
    if(!r.ok){ setMsg(j.error ?? "Falha"); return; }
    setName(""); setContent(""); setCat(""); setMsg("Criado ✓"); load();
  }
  async function toggle(t:Tpl){
    await fetch(`/api/whatsapp/templates/${t.id}`,{ method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ isActive: !t.isActive }) });
    load();
  }
  async function del(t:Tpl){
    if(!confirm(`Deletar ${t.name}?`)) return;
    await fetch(`/api/whatsapp/templates/${t.id}`,{ method:"DELETE" });
    load();
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">Templates WhatsApp — DB</h3>
      <p className="text-xs text-zinc-500">Spintax suportado: {`{olá|oi|opa}`} — variáveis: {`{{nome}} {{nextStep}} {{valor}} {{data}} {{hora}}`}</p>
      <div className="mt-3 space-y-2">
        {items.map(it=>(
          <div key={it.id} className="rounded border border-zinc-800 bg-zinc-950 p-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-zinc-100 flex items-center gap-2"><span className="font-medium">{it.name}</span>{it.category && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{it.category}</span>}{!it.isActive && <span className="rounded bg-amber-900 px-1.5 py-0.5 text-[10px] text-amber-300">inativo</span>}</div>
              <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{it.content}</div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={()=>toggle(it)} className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">{it.isActive?"Desativar":"Ativar"}</button>
              <button onClick={()=>del(it)} className="rounded border border-red-800 px-2 py-1 text-[11px] text-red-400">Deletar</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 rounded border border-zinc-800 bg-zinc-950 p-3">
        <div className="text-xs font-medium text-zinc-300">Novo template</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome ex: Follow-up 7 dias" className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200" />
        <input value={cat} onChange={e=>setCat(e.target.value)} placeholder="Categoria (followup, reminder, proposal...)" className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200" />
        <textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} placeholder="Conteúdo com {{nome}} etc. Spintax {olá|oi} permitido" className="rounded border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 w-full" />
        <button onClick={create} disabled={saving} className="h-8 rounded bg-sky-600 px-3 text-xs font-medium text-white disabled:opacity-50">{saving?"Salvando...":"Criar template"}</button>
        {msg && <span className="text-xs text-zinc-400">{msg}</span>}
      </div>
    </div>
  );
}

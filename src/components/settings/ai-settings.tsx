"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Cfg={ provider:string, model:string|null, useLitellm:boolean, litellmUrl:string, hasKeys:Record<string,boolean>, masked:Record<string,string> };

export function AISettings(){
  const [cfg,setCfg]=useState<Cfg|null>(null);
  const [form,setForm]=useState<Record<string,string>>({});
  const [provider,setProvider]=useState("openai");
  const [model,setModel]=useState("");
  const [useLitellm,setUseLitellm]=useState(true);
  const [msg,setMsg]=useState<string|null>(null);
  const [test,setTest]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  async function load(){
    const r=await fetch("/api/settings/ai"); const j=await r.json(); setCfg(j); setProvider(j.provider??"openai"); setModel(j.model??""); setUseLitellm(j.useLitellm??true);
  }
  useEffect(()=>{ load(); },[]);

  async function save(){
    setLoading(true); setMsg(null);
    const body:any={ provider, model: model||null, useLitellm };
    for(const k of ["openaiKey","anthropicKey","geminiKey","openrouterKey","litellmKey"]){
      if(form[k]?.trim()) body[k]=form[k].trim();
    }
    const r=await fetch("/api/settings/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setMsg(j.error??"Falha"); return; }
    setMsg("Salvo ✓ — LiteLLM integrado, sem deploy separado"); load(); setForm({});
  }
  async function doTest(){
    setTest("Testando...");
    const r=await fetch("/api/settings/ai/test",{method:"POST"});
    const j=await r.json().catch(()=>({}));
    setTest(j.ok?`✓ OK via ${j.via} (${j.status})`:`✗ ${j.error??j.status}`);
  }

  if(!cfg) return <Card><CardContent className="pt-4 text-sm text-zinc-500">Carregando IA...</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">IA — LiteLLM integrado</CardTitle><p className="text-xs text-zinc-500">LiteLLM roda junto ao app (sem deploy separado). Configure provider/model e chaves — salvo criptografado por org.</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center"><Badge className={useLitellm?"bg-emerald-600":"bg-zinc-700"}>{useLitellm?"LiteLLM ON":"LiteLLM OFF"}</Badge><span className="text-xs text-zinc-500">URL: {cfg.litellmUrl}</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Provider padrão</Label><select value={provider} onChange={e=>setProvider(e.target.value)} className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select></div>
          <div className="space-y-1.5"><Label>Model (opcional)</Label><Input value={model} onChange={e=>setModel(e.target.value)} placeholder="gpt-4o-mini / claude-3-5-sonnet" /></div>
          <div className="space-y-1.5 flex items-center gap-2 pt-6"><input type="checkbox" checked={useLitellm} onChange={e=>setUseLitellm(e.target.checked)} /><Label>Usar LiteLLM proxy (recomendado prod)</Label></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>OpenAI API Key {cfg.hasKeys.openai?`(${cfg.masked.openai})`:""}</Label><Input type="password" value={form.openaiKey??""} onChange={e=>setForm({...form,openaiKey:e.target.value})} placeholder="sk-..." /></div>
          <div className="space-y-1.5"><Label>Anthropic {cfg.hasKeys.anthropic?`(${cfg.masked.anthropic})`:""}</Label><Input type="password" value={form.anthropicKey??""} onChange={e=>setForm({...form,anthropicKey:e.target.value})} placeholder="sk-ant-..." /></div>
          <div className="space-y-1.5"><Label>Gemini {cfg.hasKeys.gemini?`(${cfg.masked.gemini})`:""}</Label><Input type="password" value={form.geminiKey??""} onChange={e=>setForm({...form,geminiKey:e.target.value})} placeholder="AIza..." /></div>
          <div className="space-y-1.5"><Label>OpenRouter {cfg.hasKeys.openrouter?`(${cfg.masked.openrouter})`:""}</Label><Input type="password" value={form.openrouterKey??""} onChange={e=>setForm({...form,openrouterKey:e.target.value})} placeholder="sk-or-..." /></div>
          <div className="space-y-1.5"><Label>LiteLLM Master Key</Label><Input type="password" value={form.litellmKey??""} onChange={e=>setForm({...form,litellmKey:e.target.value})} placeholder="sk-closer-master" /></div>
        </div>
        <div className="flex gap-2"><Button size="sm" onClick={save} disabled={loading}>{loading?"Salvando...":"Salvar IA"}</Button><Button size="sm" variant="outline" onClick={doTest}>Testar conexão</Button></div>
        {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        {test && <p className="text-xs text-sky-400">{test}</p>}
        <p className="text-xs text-zinc-500">Sem chaves → MockProvider (demo). Com LiteLLM ON, o app fala com <code>http://litellm:4000</code> e o proxy roteia/faz failover/budget. Sem deploy separado: já está no docker-compose.</p>
      </CardContent>
    </Card>
  );
}

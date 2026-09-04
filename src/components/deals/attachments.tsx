"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Attachments({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<{ name: string; size: number; url: string; mtime: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  async function load() {
    const r = await fetch(`/api/deals/${dealId}/attachments`).then(r=>r.json()).catch(()=>({items:[]}));
    setItems(r.items ?? []);
  }
  useEffect(()=>{ load(); },[dealId]);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f) return;
    if(f.size>10*1024*1024){ setErr("max 10MB"); return; }
    setUploading(true); setErr(null);
    const fd=new FormData(); fd.append("file", f);
    const r=await fetch(`/api/deals/${dealId}/attachments`,{method:"POST",body:fd});
    const j=await r.json().catch(()=>({}));
    setUploading(false);
    if(!r.ok){ setErr(JSON.stringify(j.error ?? j)); return; }
    load(); e.target.value="";
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Anexos</CardTitle><label className="text-xs text-sky-400 hover:underline cursor-pointer">{uploading?"Enviando...":" + Anexar"}<input type="file" className="hidden" onChange={onFile} disabled={uploading} /></label></CardHeader>
      <CardContent className="space-y-2">
        {err && <p className="text-xs text-red-400">{err}</p>}
        {items.length===0 && <p className="text-xs text-zinc-500">Nenhum anexo — proposta, contrato, comprovante.</p>}
        {items.map(it=>(
          <a key={it.url} href={it.url} target="_blank" className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
            <span className="text-xs text-zinc-200 truncate">{it.name}</span><span className="text-[11px] text-zinc-500">{(it.size/1024).toFixed(0)}KB</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

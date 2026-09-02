"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function normalizeUrl(u:string){
  const t=u.trim();
  if(!t) return "";
  if(t.startsWith("http")) return t;
  if(t.includes("meet.google.com") || t.includes("zoom.us") || t.includes("zoom.com")) return "https://"+t;
  return t;
}

export function MeetZoomEmbed(){
  const [provider,setProvider]=useState<"meet"|"zoom"|"custom">("meet");
  const [url,setUrl]=useState("");
  const [joined,setJoined]=useState(false);
  const src = normalizeUrl(url);
  const canJoin = src && (src.includes("meet.google.com") || src.includes("zoom.") || provider==="custom");

  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-sm">Vídeo — Google Meet / Zoom (sem sair da plataforma)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <select value={provider} onChange={e=>setProvider(e.target.value as never)} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm">
            <option value="meet">Google Meet</option>
            <option value="zoom">Zoom</option>
            <option value="custom">Link custom</option>
          </select>
          <Input value={url} onChange={e=>setUrl(e.target.value)} placeholder={provider==="meet"?"https://meet.google.com/xxx-xxxx-xxx":provider==="zoom"?"https://zoom.us/j/123456789?pwd=...":"https://..."} className="flex-1" />
          <Button size="sm" disabled={!canJoin} onClick={()=>setJoined(true)}>Entrar</Button>
          {joined && <Button size="sm" variant="outline" onClick={()=>setJoined(false)}>Sair</Button>}
        </div>
        <div className="text-xs text-zinc-500">Cole o link da call (Meet ou Zoom). O vídeo abre em iframe dentro do Closer OS — você vê a call e o Live Coach lado a lado. Para Zoom com login exigido, use Zoom Web Client: troque <code>zoom.us/j/</code> por <code>zoom.us/wc/join/</code>.</div>
        {joined && src ? (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black" style={{ aspectRatio:"16/9" }}>
            <iframe src={src} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-full w-full" title="meet-zoom" />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-10 text-sm text-zinc-500" style={{ aspectRatio:"16/9" }}>
            Cole o link e clique Entrar para ver a call aqui
          </div>
        )}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-400">
          <b className="text-zinc-200">Como integrar nativo:</b> Meet via Google Calendar (crie evento com conferência) gera link automaticamente — veja <code>/integrations</code>. Zoom via Meeting SDK exigirá <code>NEXT_PUBLIC_ZOOM_SDK_KEY</code>; iframe já funciona sem SDK para MVP.
        </div>
      </CardContent>
    </Card>
  );
}

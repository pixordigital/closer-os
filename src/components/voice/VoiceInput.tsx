"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = { onTranscript: (text: string) => void; disabled?: boolean };

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recRef = useRef<unknown>(null);

  useEffect(() => {
    const SR = (typeof window !== "undefined" && ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition)) as (new () => unknown) | undefined;
    setSupported(!!SR);
  }, []);

  function start() {
    const SR = ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as new () => {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
      onend: () => void; start: () => void; stop: () => void;
    };
    if (!SR) return;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join(" ");
      setText(t);
    };
    rec.onend = () => { setListening(false); if (text) onTranscript(text); };
    recRef.current = rec;
    rec.start(); setListening(true);
  }
  function stop() {
    (recRef.current as { stop?: () => void })?.stop?.(); setListening(false);
    if (text) onTranscript(text);
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs font-medium text-zinc-300">Voice input</div>
      {!supported ? (
        <p className="mt-1 text-xs text-zinc-500">Web Speech não suportado neste navegador — cole texto abaixo ou use a API <code className="text-zinc-400">/api/calls/:id/transcribe</code>.</p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          {!listening ? <Button size="sm" onClick={start} disabled={disabled}>🎙️ Gravar</Button> : <Button size="sm" variant="ghost" onClick={stop}>Parar</Button>}
          <span className="text-xs text-zinc-500">{listening ? "ouvindo…" : "pt-BR"}</span>
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ou digite/cole transcript aqui..." rows={3} className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500" />
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="outline" disabled={disabled || !text.trim()} onClick={() => onTranscript(text.trim())}>Usar texto</Button>
      </div>
    </div>
  );
}

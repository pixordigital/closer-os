"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: string; speaker: "SELLER"|"PROSPECT"|"SYSTEM"; content: string; timestamp: string };

export function SessionRunner({ sessionId, initialMessages, isActive }: { sessionId: string; initialMessages: Msg[]; isActive: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  async function send() {
    const content = input.trim();
    if (!content) return;
    setSending(true); setErr(null);
    const res = await fetch(`/api/roleplay/sessions/${sessionId}/message`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    const j = await res.json().catch(()=>({}));
    setSending(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    // append seller + prospect
    const now = new Date().toISOString();
    setMessages(prev => [...prev, { id: `s_${Date.now()}`, speaker: "SELLER", content, timestamp: now }, { id: j.prospect.id, speaker: "PROSPECT", content: j.prospect.content, timestamp: j.prospect.timestamp ?? now }]);
    setInput("");
  }

  async function complete() {
    if (!confirm("Finalizar e avaliar sessão?")) return;
    setCompleting(true); setErr(null);
    const res = await fetch(`/api/roleplay/sessions/${sessionId}/complete`, { method: "POST" });
    const j = await res.json().catch(()=>({}));
    setCompleting(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/roleplay/sessions/${sessionId}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 max-h-[520px] overflow-auto">
        {messages.map(m=>(
          <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.speaker==="SELLER" ? "bg-sky-950/40 border border-sky-900/40 ml-8" : m.speaker==="PROSPECT" ? "bg-zinc-900 border border-zinc-800 mr-8" : "bg-zinc-800 text-zinc-400"}`}>
            <div className="text-[11px] uppercase tracking-wide opacity-60">{m.speaker}</div>
            <div className="mt-1 whitespace-pre-wrap text-zinc-100">{m.content}</div>
          </div>
        ))}
        {messages.length===0 && <p className="text-sm text-zinc-500">Nenhuma mensagem ainda.</p>}
      </div>

      {isActive ? (
        <>
          <div className="flex gap-2">
            <Textarea rows={2} value={input} onChange={e=>setInput(e.target.value)} placeholder="Sua mensagem como seller..." onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }}} />
            <Button disabled={sending || !input.trim()} onClick={send} className="self-end">{sending ? "..." : "Enviar"}</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={completing} onClick={complete}>{completing ? "Avaliando..." : "Complete & Evaluate"}</Button>
            <span className="text-xs text-zinc-500 self-center">Sem coaching durante simulação (§61). Enter envia, Shift+Enter quebra linha.</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Sessão finalizada. Veja avaliação abaixo.</p>
      )}
      {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-2 text-xs text-red-300">{err}</pre>}
    </div>
  );
}

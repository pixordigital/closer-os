"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATES = [
  { label: "Follow-up D+1", text: "Oi {{nome}}, obrigado pelo papo hoje! Como combinado, segue próximo passo: {{nextStep}}. Quando falamos de novo?" },
  { label: "Lembrete call", text: "Oi {{nome}}, lembrando nossa call {{data}} às {{hora}}. Confirma? Qualquer coisa me chama aqui." },
  { label: "Proposta", text: "Oi {{nome}}, enviei a proposta de {{valor}}. Dá uma olhada e me diz o que achou — tiro qualquer dúvida por aqui." },
  { label: "Check-in parado", text: "Oi {{nome}}, vi que o projeto ficou parado. Voltou a ser prioridade? Posso ajudar a destravar." },
  { label: "Áudio — resumo", text: "Oi {{nome}}, gravei um áudio resumindo o que conversamos + próximo passo. Me diz se faz sentido?" },
];

function fill(t: string, v: Record<string, string>) {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? `{{${k}}}`);
}

export function WhatsappShare({ dealId, dealName, contactName, contactPhone, nextStep, value, currency }: {
  dealId: string; dealName: string; contactName?: string | null; contactPhone?: string | null;
  nextStep?: string | null; value?: unknown; currency?: string;
}) {
  const [instance, setInstance] = useState("");
  const [number, setNumber] = useState(contactPhone ?? "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function pick(t: string) {
    const vars: Record<string, string> = {
      nome: contactName ?? "você",
      nextStep: nextStep ?? "—",
      valor: value != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency ?? "BRL" }).format(Number(value)) : "—",
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setText(fill(t, vars));
  }

  async function send() {
    if (!text.trim()) { setMsg("Texto vazio"); return; }
    const clean = number.replace(/\D/g, "");
    if (clean.length < 10) { setMsg("Número inválido — use 55DDDnumero"); return; }
    if (!instance.trim()) { setMsg("Informe a instância Evolution (ex: closer-xxxxxx) ou crie em /api/whatsapp/instance"); return; }
    setSending(true); setMsg(null);
    const r = await fetch("/api/whatsapp/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instance: instance.trim(), number: clean, text: text.trim(), dealId }),
    });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { setMsg(j.error ?? "Falha"); return; }
    setMsg(`Enviado ✓ delay ${j.antiban?.delay}ms typing ${j.antiban?.typing}ms`);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="font-medium">WhatsApp — 1 clique</h2>
      <p className="mt-1 text-xs text-zinc-500">Deal <span className="text-zinc-300">{dealName}</span>{contactName ? <> · {contactName}{contactPhone ? ` · ${contactPhone}` : ""}</> : " · sem contato"} · spintax {`{olá|oi|opa}`} + antiban + typing</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button key={t.label} onClick={() => pick(t.text)} className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700">{t.label}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="Instância Evolution (closer-xxxxxx)" className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número 55DDDnumero" className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Escolha um template acima ou digite..." className="mt-2" />
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={send} disabled={sending}>{sending ? "Enviando..." : "Enviar WhatsApp"}</Button>
        {contactPhone && <a href={`https://wa.me/${contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text || "Oi!")}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline">Abrir wa.me ↗</a>}
        {msg && <span className="text-xs text-zinc-400">{msg}</span>}
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">Sem número? Cadastre no contato. Sem instância? <code className="text-zinc-400">POST /api/whatsapp/instance</code> cria QR.</p>
    </section>
  );
}

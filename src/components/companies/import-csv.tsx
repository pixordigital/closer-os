"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ponytail: 1 componente cobre file upload + textarea + preview + dedupe via /api/import/pipedrive quando houver deal/contact
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { row.push(cur.trim()); cur = ""; continue; }
    if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && n === "\n") i++;
      row.push(cur.trim()); cur = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += c;
  }
  row.push(cur.trim());
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

function autoMap(header: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  header.forEach((h, i) => {
    const k = h.toLowerCase().trim();
    if (["company", "empresa", "companyname", "company_name"].some((x) => k.includes(x))) m.companyName = i;
    else if (k === "name" && m.companyName == null) m.companyName = i;
    else if (["deal", "negocio", "negócio", "dealname", "deal_name", "oportunidade"].some((x) => k.includes(x))) m.dealName = i;
    else if (["value", "valor", "price", "preco", "preço"].some((x) => k.includes(x))) m.value = i;
    else if (["contact_name", "contactname", "contato", "nome contato"].some((x) => k.includes(x)) || (k === "contact" && m.companyName != null)) m.contactName = i;
    else if (k.includes("email")) m.contactEmail = i;
    else if (["phone", "telefone", "cel", "whatsapp", "contactphone"].some((x) => k.includes(x))) m.contactPhone = i;
    else if (k.includes("website") || k.includes("site")) m.website = i;
    else if (k.includes("industry") || k.includes("setor") || k.includes("segmento")) m.industry = i;
    else if (k.includes("stage") || k.includes("estagio") || k.includes("estágio")) m.stage = i;
  });
  // fallback: se só 1 coluna name-like, é companyName
  if (m.companyName == null && header.length >= 1) {
    const first = header[0]?.toLowerCase();
    if (first && !["value", "valor", "email", "phone"].some((x) => first.includes(x))) m.companyName = 0;
  }
  return m;
}

export function ImportCsv() {
  const [text, setText] = useState("name,website,industry\nAcme SaaS,https://acme.com,SaaS\nNordic Log,https://nordic.com,Logística");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Record<string, number> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const t = String(r.result ?? "");
      setText(t);
      const rows = parseCsv(t);
      if (rows.length >= 1) {
        setPreview(rows.slice(0, 6));
        setMap(autoMap(rows[0]));
      }
      setMsg(`Arquivo carregado: ${f.name} · ${rows.length - 1} linhas · preview abaixo`);
    };
    r.readAsText(f);
  }

  function recomputePreview() {
    const rows = parseCsv(text);
    if (!rows.length) { setPreview(null); setMap(null); return; }
    setPreview(rows.slice(0, 6));
    setMap(autoMap(rows[0]));
  }

  async function go() {
    setLoading(true); setMsg(null);
    const rowsRaw = parseCsv(text.trim());
    if (!rowsRaw.length) { setMsg("CSV vazio"); setLoading(false); return; }
    const header = rowsRaw[0].map((s) => s.trim());
    const m = map ?? autoMap(header);
    const hasRich = m.dealName != null || m.contactName != null || m.contactEmail != null || m.value != null;
    // detect header row vs data: se header contém companyName-like, pula primeira linha
    const hasHeader = m.companyName != null && header[m.companyName]?.toLowerCase().includes("name") || header.some((h) => ["company", "empresa", "deal", "email", "phone"].some((k) => h.toLowerCase().includes(k)));
    const dataRows = hasHeader ? rowsRaw.slice(1) : rowsRaw;

    if (hasRich) {
      const rows = dataRows.map((r) => ({
        companyName: (m.companyName != null ? r[m.companyName] : r[0] ?? "")?.trim(),
        dealName: m.dealName != null ? r[m.dealName]?.trim() || undefined : undefined,
        value: m.value != null ? (r[m.value]?.trim() ? Number(String(r[m.value]).replace(/[^\d.,-]/g, "").replace(",", ".")) : undefined) : undefined,
        contactName: m.contactName != null ? r[m.contactName]?.trim() || undefined : undefined,
        contactEmail: m.contactEmail != null ? r[m.contactEmail]?.trim() || undefined : undefined,
        contactPhone: m.contactPhone != null ? r[m.contactPhone]?.trim() || undefined : undefined,
        website: m.website != null ? r[m.website]?.trim() || undefined : undefined,
        industry: m.industry != null ? r[m.industry]?.trim() || undefined : undefined,
        stage: m.stage != null ? r[m.stage]?.trim().toUpperCase() || undefined : undefined,
      })).filter((r) => r.companyName);
      if (!rows.length) { setMsg("Nenhuma linha válida (companyName vazio)"); setLoading(false); return; }
      const r = await fetch("/api/import/pipedrive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const j = await r.json().catch(() => ({}));
      setLoading(false);
      if (!r.ok) { setMsg(JSON.stringify(j.error ?? j).slice(0, 400)); return; }
      setMsg(`Importado ${j.companiesCreated} empresas · ${j.contactsCreated} contatos · ${j.dealsCreated} deals · ignorados ${j.skipped}${j.errors?.length ? ` · erros ${j.errors.length}` : ""}`);
      setTimeout(() => location.reload(), 900);
      return;
    }

    // fallback simples: /api/companies/import
    const rows = dataRows.map((r) => ({
      name: (m.companyName != null ? r[m.companyName] : r[0] ?? "")?.trim(),
      website: m.website != null ? r[m.website]?.trim() || undefined : undefined,
      industry: m.industry != null ? r[m.industry]?.trim() || undefined : undefined,
    })).filter((r) => r.name);
    const r = await fetch("/api/companies/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) { setMsg(JSON.stringify(j.error ?? j).slice(0, 400)); return; }
    setMsg(`Importado ${j.created} · ignorados ${j.skipped}`);
    setTimeout(() => location.reload(), 800);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Import CSV — universal (empresas + contatos + deals) · dedupe automático</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Escolher .csv</Button>
          <Button size="sm" variant="ghost" onClick={recomputePreview}>Preview</Button>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent("companyName,dealName,value,contactName,contactEmail,contactPhone,website,industry,stage\nAcme Ltda,Acme - Plano Pro,50000,Joao Silva,joao@acme.com,5511999999999,https://acme.com,SaaS,LEAD\nNordic Log,Nordic - Implantacao,,Maria Souza,maria@nordic.com,5511988887777,https://nordic.com,Logistica,QUALIFIED")}`} download="modelo-closer.csv" className="text-xs text-sky-400 hover:underline">Baixar modelo</a>
          <span className="text-xs text-zinc-500">ou cole abaixo · 500/lote · dedupe por nome/email</span>
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="font-mono text-xs" placeholder="companyName,dealName,value,contactName,contactEmail..." />
        {preview && (
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400"><tr>{preview[0]?.map((h, i) => <th key={i} className={`px-2 py-1 text-left font-medium ${map && Object.values(map).includes(i) ? "text-emerald-400" : ""}`}>{h || `col${i + 1}`}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800">{preview.slice(1).map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="px-2 py-1 text-zinc-300">{c || "—"}</td>)}</tr>)}</tbody>
            </table>
            {map && <p className="px-2 py-1 text-[11px] text-zinc-500">Mapeado: {Object.entries(map).map(([k, v]) => `${k}→col${(v as number) + 1}`).join(" · ")} · edite header se precisar</p>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={go} disabled={loading}>{loading ? "Importando..." : "Importar"}</Button>
          {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        </div>
        <p className="text-xs text-zinc-500">Dica: CSV com colunas <code className="text-zinc-400">companyName,dealName,value,contactName,contactEmail,contactPhone</code> cria tudo de uma vez. Só <code className="text-zinc-400">name,website,industry</code> cria só empresas. Dedupe case-insensitive.</p>
      </CardContent>
    </Card>
  );
}

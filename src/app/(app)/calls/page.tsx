import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function CallsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim().toUpperCase() || undefined;
  const dealId = (sp.dealId ?? "").trim() || undefined;
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string, string>).toString());
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const where = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { deal: { select: { id: true, name: true } }, transcript: { select: { id: true } } },
    }),
    prisma.call.count({ where: where as never }),
  ]);
  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
          <p className="mt-1 text-sm text-zinc-400">Registro manual transcript MVP · análise IA Phase 5</p>
        </div>
        <Link href="/calls/new"><Button size="sm">+ Nova call</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar call..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos status</option>
          {["SCHEDULED","COMPLETED","CANCELLED"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr><th className="px-4 py-2 text-left">Call</th><th className="px-4 py-2 text-left">Deal</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Transcript</th><th className="px-4 py-2 text-left">Data</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhuma call.</td></tr>}
            {items.map(c=>(
              <tr key={c.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3"><Link href={`/calls/${c.id}`} className="font-medium text-zinc-100 hover:underline">{c.title}</Link>
                  <div className="text-xs text-zinc-500">{c.duration ? `${Math.round(c.duration/60)} min` : ""} {c.analysisStatus !== "PENDING" ? `· ${c.analysisStatus}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{c.deal ? <Link href={`/deals/${c.deal.id}`} className="hover:underline">{c.deal.name}</Link> : "—"}</td>
                <td className="px-4 py-3"><Badge>{c.status}</Badge></td>
                <td className="px-4 py-3 text-xs">{c.transcript ? <span className="text-emerald-400">sim</span> : <span className="text-zinc-500">—</span>}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
    </div>
  );
}

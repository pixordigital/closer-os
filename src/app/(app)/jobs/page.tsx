import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string, string>).toString());
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const status = (sp.status ?? "").trim().toUpperCase() || undefined;
  const where = { ...(organizationId ? { organizationId } : {}), ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.aIJob.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.aIJob.count({ where: where as never }),
  ]);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs §84</h1>
        <p className="mt-1 text-sm text-zinc-400">
          DB-backed queue (SKIP LOCKED) · POST /api/jobs {"{type, payload, runAt?}"} · POST /api/jobs/run drains one · runAt + exponential backoff
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Queue ({total} total · página {page})</h2>
          <form className="flex gap-2">
            <select name="status" defaultValue={status ?? ""} className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300">
              <option value="">Todos status</option>
              {["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="submit" className="h-8 rounded-md border border-zinc-800 bg-zinc-800 px-3 text-xs text-zinc-100">Filtrar</button>
          </form>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-400">
              <tr><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Attempts</th><th className="px-3 py-2 text-left">RunAt</th><th className="px-3 py-2 text-left">Created</th><th className="px-3 py-2 text-left">Error</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-500">Nenhum job.</td></tr>}
              {items.map((j) => (
                <tr key={j.id} className="hover:bg-zinc-950/60">
                  <td className="px-3 py-2 font-mono text-xs text-zinc-200">{j.type}</td>
                  <td className="px-3 py-2"><Badge className={j.status==="COMPLETED"?"bg-emerald-900/30 text-emerald-300 border-emerald-800":j.status==="FAILED"?"bg-red-900/30 text-red-300 border-red-800":j.status==="RUNNING"?"bg-sky-900/30 text-sky-300 border-sky-800":"bg-zinc-800 text-zinc-400"}>{String(j.status)}</Badge></td>
                  <td className="px-3 py-2 text-zinc-400">{j.attempts}/{j.maxAttempts}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{j.runAt ? new Date(j.runAt).toLocaleString("pt-BR") : "—"}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{new Date(j.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-xs text-red-400">{j.error ? j.error.slice(0,80) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Worker: cron or POST /api/jobs/run. Handlers stubbed — canonical logic em /api/calls/:id/analyze etc.</p>
      </section>
    </div>
  );
}

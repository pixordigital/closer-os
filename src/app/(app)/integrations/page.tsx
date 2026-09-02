import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { listProviders } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { organizationId } = await requireTenant();
  const [items, providers] = await Promise.all([
    prisma.integrationConnection.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
    Promise.resolve(listProviders()),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-zinc-400">Conecte calendar/transcript. Mock pronto; Google stub quando <code className="text-zinc-300">GOOGLE_CALENDAR_CREDENTIALS</code> configurado. Import cria Call+Transcript.</p>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Providers disponíveis</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {providers.map((p) => <Badge key={p.name} className="border-zinc-700 bg-zinc-800">{p.name} · {p.kind}</Badge>)}
        </div>
        <p className="mt-2 text-xs text-zinc-500">POST <code>/api/integrations</code> {"{ provider, config }"} · POST <code>/api/integrations/import</code> {"{ text|url, dealId? }"} · GET <code>/api/copilot/stream?callId=&dealId=</code> SSE.</p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Conexões ({items.length})</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhuma conexão. Use <code className="text-zinc-300">POST /api/integrations {"{ provider: 'mock-calendar' }"}</code> ou <code className="text-zinc-300">mock-transcript</code>.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500"><tr><th className="py-1 pr-3">Provider</th><th className="py-1 pr-3">Kind</th><th className="py-1 pr-3">Status</th><th className="py-1">Criada</th></tr></thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-800">
                    <td className="py-2 pr-3 font-mono text-xs">{row.provider}</td><td className="py-2 pr-3 text-zinc-300">{row.kind}</td><td className="py-2 pr-3"><Badge className={row.status === "connected" ? "border-zinc-700 bg-zinc-800" : "border-zinc-600 bg-zinc-700"}>{row.status}</Badge></td><td className="py-2 text-zinc-500">{new Date(row.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

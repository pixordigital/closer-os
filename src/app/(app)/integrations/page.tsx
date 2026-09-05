import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { EvolutionQuick } from "@/components/whatsapp/evolution-quick";
import { GoogleQuick } from "@/components/integrations/google-quick";
import { WhatsappAnalytics } from "@/components/whatsapp/analytics-card";
import { TemplatesQuick } from "@/components/whatsapp/templates-quick";
import { BulkQuick } from "@/components/whatsapp/bulk-quick";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { organizationId } = await requireTenant();
  const items = await prisma.integrationConnection.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-400">Conecte calendar/transcript. Mock pronto; Google stub quando <code className="text-zinc-300">GOOGLE_CALENDAR_CREDENTIALS</code> configurado. Import cria Call+Transcript.</p>
      </div>
      <EvolutionQuick />
      <WhatsappAnalytics />
      <div className="grid gap-6 lg:grid-cols-2">
        <TemplatesQuick />
        <BulkQuick />
      </div>
      <GoogleQuick />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
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

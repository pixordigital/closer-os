import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function WebhooksPage() {
  const { organizationId } = await requireTenant();
  const [endpoints, deliveries] = await Promise.all([
    prisma.webhookEndpoint.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.webhookDelivery.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks §83</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Outbound HMAC (X-Closer-Signature) + idempotencyKey · Inbound POST /api/webhooks/inbound (HMAC verify) · Manage via /api/webhooks/outbound
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium">Endpoints ({endpoints.length})</h2>
        {endpoints.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhum endpoint. POST /api/webhooks/outbound {"{ url, secret (≥16), events[] }"}.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-400">
                <tr><th className="px-3 py-2 text-left">URL</th><th className="px-3 py-2 text-left">Events</th><th className="px-3 py-2 text-left">Enabled</th><th className="px-3 py-2 text-left">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {endpoints.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-950/60">
                    <td className="px-3 py-2 font-mono text-xs text-zinc-200">{e.url}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">{(e.events as unknown as string[]).join(", ")}</td>
                    <td className="px-3 py-2"><Badge className={e.enabled ? "bg-emerald-900/30 text-emerald-300 border-emerald-800" : "bg-zinc-800 text-zinc-400"}>{e.enabled ? "on" : "off"}</Badge></td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{new Date(e.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">Secret mascarado na API (secretMasked). PATCH /api/webhooks/outbound/[id] para rotacionar.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium">Recent deliveries ({deliveries.length})</h2>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhuma entrega ainda. Eventos disparam deliveries por endpoint inscrito.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-400">
                <tr><th className="px-3 py-2 text-left">Event</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Attempts</th><th className="px-3 py-2 text-left">HTTP</th><th className="px-3 py-2 text-left">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-950/60">
                    <td className="px-3 py-2 text-zinc-200">{d.event}</td>
                    <td className="px-3 py-2"><Badge className={d.status==="success"?"bg-emerald-900/30 text-emerald-300 border-emerald-800":d.status==="failed"?"bg-red-900/30 text-red-300 border-red-800":"bg-zinc-800 text-zinc-400"}>{d.status}</Badge></td>
                    <td className="px-3 py-2 text-zinc-400">{d.attempts}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{d.responseStatus ?? "—"} {d.lastError ? `· ${d.lastError.slice(0,80)}` : ""}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{new Date(d.createdAt).toLocaleString("pt-BR")}</td>
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

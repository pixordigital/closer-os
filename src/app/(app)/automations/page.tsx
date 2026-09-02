import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function AutomationsPage() {
  const { organizationId } = await requireTenant();
  const [rules, runs] = await Promise.all([
    prisma.automationRule.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.automationRun.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automations §84</h1>
        <p className="mt-1 text-sm text-zinc-400">
          TRIGGER → CONDITIONS → ACTION · 6 actions: analyze_transcript, generate_insights, generate_followup, create_task, recommend_roleplay, enqueue_job · Manage via /api/automations
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium">Rules ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Nenhuma rule. POST /api/automations {"{ trigger, actions[], conditions? }"} · triggers: call.completed, call.created, deal.created, deal.updated, roleplay.completed, followup.approved
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-400">
                <tr><th className="px-3 py-2 text-left">Trigger</th><th className="px-3 py-2 text-left">Actions</th><th className="px-3 py-2 text-left">Enabled</th><th className="px-3 py-2 text-left">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-950/60">
                    <td className="px-3 py-2 font-mono text-xs text-zinc-200">{r.trigger}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">{JSON.stringify(r.actions).slice(0,120)}</td>
                    <td className="px-3 py-2"><Badge className={r.enabled ? "bg-emerald-900/30 text-emerald-300 border-emerald-800" : "bg-zinc-800 text-zinc-400"}>{r.enabled ? "on" : "off"}</Badge></td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium">Recent runs ({runs.length})</h2>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhum run ainda. Runs são criados fire-and-forget após cada trigger.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-400">
                <tr><th className="px-3 py-2 text-left">Trigger</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Result</th><th className="px-3 py-2 text-left">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-950/60">
                    <td className="px-3 py-2 text-zinc-200">{r.triggerEvent}</td>
                    <td className="px-3 py-2"><Badge className={r.status==="success"?"bg-emerald-900/30 text-emerald-300 border-emerald-800":r.status==="failed"?"bg-red-900/30 text-red-300 border-red-800":"bg-zinc-800 text-zinc-400"}>{r.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{r.error ? r.error.slice(0,100) : JSON.stringify(r.result ?? {}).slice(0,100) || "—"}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
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

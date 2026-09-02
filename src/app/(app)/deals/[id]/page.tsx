import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmt(v: unknown, cur: string) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(Number(v));
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const deal = await prisma.deal.findFirst({
    where: { id, organizationId },
    include: {
      company: true,
      primaryContact: true,
      calls: { orderBy: { createdAt: "desc" }, take: 5, include: { transcript: true } },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!deal) notFound();

  const riskSignals: string[] = [];
  if (!deal.primaryContactId) riskSignals.push("Sem decisor");
  if (!deal.nextStep) riskSignals.push("Sem next step");
  if (!deal.urgency) riskSignals.push("Sem urgência");
  if (!deal.painSummary) riskSignals.push("Sem dor mapeada");

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{deal.stage}</Badge>
            {deal.probability != null && <span className="text-xs text-zinc-500">{deal.probability}%</span>}
            <span className="text-xs text-zinc-600">{deal.currency}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{deal.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            <Link href={`/companies/${deal.company.id}`} className="hover:underline text-zinc-200">{deal.company.name}</Link>
            {deal.primaryContact ? <> · <Link href={`/contacts/${deal.primaryContact.id}`} className="hover:underline">{deal.primaryContact.name}</Link> {deal.primaryContact.role && <span className="text-zinc-500">({deal.primaryContact.role})</span>}</> : <> · <span className="text-amber-500/80">sem contato principal</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/deals/${deal.id}/edit`}><Button variant="outline" size="sm">Editar</Button></Link>
          <Link href={`/pipeline`}><Button variant="ghost" size="sm">← Pipeline</Button></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Valor</div>
          <div className="mt-1 text-xl font-semibold">{fmt(deal.value, deal.currency)}</div>
          <div className="text-xs text-zinc-500 mt-1">{deal.probability != null ? `${deal.probability}% prob.` : "sem probabilidade"}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Expected close</div>
          <div className="mt-1 text-sm font-medium">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("pt-BR") : "—"}</div>
          <div className="text-xs text-zinc-500 mt-1">Fonte: {deal.source ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Next step</div>
          <div className="mt-1 text-sm font-medium leading-tight">{deal.nextStep ?? <span className="text-amber-500/80">sem next step</span>}</div>
          <div className="text-xs text-zinc-500 mt-1">{deal.nextStepDate ? new Date(deal.nextStepDate).toLocaleDateString("pt-BR") : ""}</div>
        </div>
        <div className={`rounded-xl border p-4 ${riskSignals.length ? "border-amber-900/50 bg-amber-950/20" : "border-zinc-800 bg-zinc-900"}`}>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Deal risk</div>
          <div className="mt-1 text-sm">
            {riskSignals.length === 0 ? <span className="text-emerald-400">Baixo risco</span> : <ul className="list-disc pl-4 text-amber-300/90">{riskSignals.map(s=><li key={s}>{s}</li>)}</ul>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Contexto</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Pain summary</dt><dd className="mt-1 text-zinc-300">{deal.painSummary ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Current solution</dt><dd className="mt-1 text-zinc-300">{deal.currentSolution ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Desired outcome</dt><dd className="mt-1 text-zinc-300">{deal.desiredOutcome ?? "—"}</dd></div>
            <div className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Urgency</dt><dd className="mt-1 text-zinc-300">{deal.urgency ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Decision process</dt><dd className="mt-1 text-zinc-300">{deal.decisionProcess ?? "—"}</dd></div>
            </div>
            <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Decision criteria</dt><dd className="mt-1 text-zinc-300">{deal.decisionCriteria ?? "—"}</dd></div>
            {deal.lostReason && <div><dt className="text-xs uppercase tracking-wide text-zinc-500">Lost reason</dt><dd className="mt-1 text-red-300">{deal.lostReason}</dd></div>}
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Calls ({deal.calls.length})</h2>
              <span className="text-xs text-zinc-500">Phase 4: transcript + análise IA</span>
            </div>
            <div className="mt-3 space-y-2">
              {deal.calls.length===0 && <p className="text-sm text-zinc-500">Nenhuma call vinculada.</p>}
              {deal.calls.map(c=>(
                <div key={c.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <div className="text-sm font-medium text-zinc-100">{c.title}</div>
                  <div className="text-xs text-zinc-500">{c.status} · {c.analysisStatus} · {new Date(c.createdAt).toLocaleDateString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Tasks ({deal.tasks.length})</h2>
              <Link href={`/tasks?dealId=${deal.id}`} className="text-xs text-sky-400 hover:underline">Ver todas</Link>
            </div>
            <div className="mt-3 space-y-2">
              {deal.tasks.length===0 && <p className="text-sm text-zinc-500">Nenhuma task.</p>}
              {deal.tasks.map(t=>(
                <div key={t.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <span className="text-sm text-zinc-200">{t.title}</span><Badge>{t.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex gap-2 text-xs text-zinc-500">
        <span>Criado {new Date(deal.createdAt).toLocaleDateString("pt-BR")}</span>
        <span>·</span>
        <span>Atualizado {new Date(deal.updatedAt).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

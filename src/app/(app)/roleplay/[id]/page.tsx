import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartSessionButton } from "@/components/roleplay/start-session-button";

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const scenario = await prisma.roleplayScenario.findFirst({
    where: { id, OR: [{ organizationId }, { organizationId: null }] },
  });
  if (!scenario) notFound();
  const owned = scenario.organizationId === organizationId;
  const hidden = scenario.hiddenContext as Record<string, unknown>;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Badge>{scenario.difficulty}</Badge><span className="text-xs text-zinc-500">{scenario.persona}</span>{scenario.industry && <span className="text-xs text-zinc-500">{scenario.industry}</span>}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{scenario.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{scenario.trainingObjective ?? "—"}</p>
        </div>
        <div className="flex gap-2">
          <StartSessionButton scenarioId={scenario.id} />
          <Link href="/roleplay"><Button variant="ghost" size="sm">← Roleplay</Button></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Contexto público (seller vê)</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{scenario.publicContext}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Ticket</dt><dd className="text-zinc-200">{scenario.ticket ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Company size</dt><dd className="text-zinc-200">{scenario.companySize ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Urgência</dt><dd className="text-zinc-200">{scenario.urgency ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Decision maker</dt><dd className="text-zinc-200">{scenario.decisionMaker ?? "—"}</dd></div>
          </dl>
          {Array.isArray(scenario.objections) && (scenario.objections as string[]).length>0 && (
            <div className="mt-3"><div className="text-xs uppercase tracking-wide text-zinc-500">Objeções</div><p className="mt-1 text-sm text-amber-300/90">{(scenario.objections as string[]).join(" · ")}</p></div>
          )}
        </section>

        <section className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4">
          <h2 className="font-medium text-amber-300">Hidden context (não revelado ao seller em sessão)</h2>
          <p className="text-xs text-zinc-500 mt-1">Seller deve descobrir via probing. Não aparece em sessão ativa.</p>
          <pre className="mt-3 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-300">{JSON.stringify(hidden, null, 2)}</pre>
          {!owned && <p className="mt-3 text-xs text-zinc-500">Template global — não editável.</p>}
        </section>
      </div>
    </div>
  );
}

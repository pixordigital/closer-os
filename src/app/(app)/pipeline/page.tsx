import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Kanban } from "@/components/pipeline/kanban";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const qRaw = (sp.q ?? "").trim();
  const stageFilter = (sp.stage ?? "").trim().toUpperCase() || undefined;

  const where: Record<string, unknown> = {
    organizationId,
    ...(stageFilter ? { stage: stageFilter } : {}),
    ...(qRaw ? { name: { contains: qRaw, mode: "insensitive" } } : {}),
  };

  const deals = await prisma.deal.findMany({
    where: where as never,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      company: { select: { name: true } },
      primaryContact: { select: { name: true } },
    },
  });

  // Serialize Decimal + Date for client
  const serialized = deals.map((d) => ({
    id: d.id,
    name: d.name,
    stage: d.stage,
    value: d.value ? Number(d.value) : null,
    currency: d.currency,
    probability: d.probability,
    nextStep: d.nextStep,
    expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
    company: d.company,
    primaryContact: d.primaryContact,
  }));

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-400">Kanban por estágio. Arraste via seletor de estágio. Filtros + busca.</p>
        </div>
        <Link href="/deals/new"><Button size="sm">+ Novo deal</Button></Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={qRaw} placeholder="Buscar deal..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="stage" defaultValue={stageFilter ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos estágios</option>
          {["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"].map((s)=><option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {(qRaw || stageFilter) && <Link href="/pipeline" className="inline-flex h-9 items-center text-sm text-zinc-400 hover:text-zinc-200">Limpar</Link>}
      </form>

      <div className="mt-6">
        <Kanban initialDeals={serialized} />
      </div>
    </div>
  );
}

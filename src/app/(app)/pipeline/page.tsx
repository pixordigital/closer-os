import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Kanban } from "@/components/pipeline/kanban";
import { computeHealth } from "@/lib/discovery";
import { getOrgRole } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId, userId } = await requireTenant();
  const role = await getOrgRole(userId, organizationId);
  const sp = await searchParams;
  const qRaw = (sp.q ?? "").trim();
  const stageFilter = (sp.stage ?? "").trim().toUpperCase() || undefined;
  const mineParam = (sp.mine ?? "").trim().toLowerCase();
  const ownerIdParam = (sp.ownerId ?? "").trim() || undefined;
  let ownerId: string | undefined = mineParam === "1" || mineParam === "true" ? userId : (ownerIdParam || undefined);
  if (role === "MEMBER") ownerId = userId;

  const where: Record<string, unknown> = {
    organizationId,
    ...(ownerId ? { ownerId } : {}),
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
      discoveryFields: { select: { status: true, key: true } },
    },
  });

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
    health: computeHealth(d.discoveryFields),
  }));

  const members = role !== "MEMBER" ? await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{ id:true, name:true } } } }) : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-400">Kanban por estágio. {role==="MEMBER" ? "Seus deals." : "Filtros por closer + busca."}</p>
        </div>
        <Link href="/deals/new"><Button size="sm">+ Novo deal</Button></Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={qRaw} placeholder="Buscar deal..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="stage" defaultValue={stageFilter ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos estágios</option>
          {["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"].map((s)=><option key={s} value={s}>{s}</option>)}
        </select>
        {role !== "MEMBER" && (
          <select name="ownerId" defaultValue={ownerId ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
            <option value="">Todos closers</option>
            {members.map(m=><option key={m.userId} value={m.userId}>{m.user.name}</option>)}
          </select>
        )}
        {role !== "MEMBER" && <label className="inline-flex items-center gap-1.5 text-xs text-zinc-400"><input type="checkbox" name="mine" value="1" defaultChecked={mineParam==="1"||mineParam==="true"} /> Meus</label>}
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {(qRaw || stageFilter || ownerId) && <Link href="/pipeline" className="inline-flex h-9 items-center text-sm text-zinc-400 hover:text-zinc-200">Limpar</Link>}
      </form>

      <div className="mt-2 text-xs text-zinc-500">{deals.length} deals{ownerId ? " · filtrado por closer" : ""}</div>

      <div className="mt-6">
        <Kanban initialDeals={serialized} />
      </div>
    </div>
  );
}

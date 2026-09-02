import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { computeHealth, healthColor, healthBarColor } from "@/lib/discovery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const stage = (sp.stage ?? "").trim().toUpperCase() || undefined;
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string,string>).toString());
  const { page, limit, skip } = parsePagination(url, { page:1, limit:20 });
  const where = {
    organizationId,
    ...(stage ? { stage } : {}),
    ...(q ? { OR: [{ name:{contains:q, mode:"insensitive" as const}},{ painSummary:{contains:q, mode:"insensitive" as const}}]}:{}),
  };
  const [itemsRaw, total] = await Promise.all([
    prisma.deal.findMany({
      where: where as never,
      orderBy:{updatedAt:"desc"}, skip, take:limit,
      include:{ company:{select:{id:true,name:true}}, primaryContact:{select:{id:true,name:true}}, discoveryFields:{ select:{ key:true, status:true } } },
    }),
    prisma.deal.count({ where: where as never }),
  ]);
  const items = itemsRaw.map((d) => ({ ...d, health: computeHealth(d.discoveryFields) }));

  function fmt(v: unknown, cur:string) {
    if(v==null) return "—";
    return new Intl.NumberFormat("pt-BR",{style:"currency",currency:cur}).format(Number(v));
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
        <Link href="/deals/new"><Button size="sm">+ Novo deal</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar deal..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="stage" defaultValue={stage ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos estágios</option>
          {["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr><th className="px-4 py-2 text-left">Deal</th><th className="px-4 py-2 text-left">Empresa</th><th className="px-4 py-2 text-left">Stage</th><th className="px-4 py-2 text-right">Valor</th><th className="px-4 py-2 text-right">Prob.</th><th className="px-4 py-2 text-left">Discovery</th><th className="px-4 py-2 text-left">Next step</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Nenhum deal.</td></tr>}
            {items.map(d=>(
              <tr key={d.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3"><Link href={`/deals/${d.id}`} className="font-medium text-zinc-100 hover:underline">{d.name}</Link><div className="text-xs text-zinc-500">{d.primaryContact?.name ?? "—"}</div></td>
                <td className="px-4 py-3 text-zinc-400">{d.company.name}</td>
                <td className="px-4 py-3"><Badge>{d.stage}</Badge></td>
                <td className="px-4 py-3 text-right text-zinc-200">{fmt(d.value, d.currency)}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{d.probability!=null?`${d.probability}%`:"—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${healthColor(d.health)}`}>{d.health}%</span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full ${healthBarColor(d.health)}`} style={{ width: `${d.health}%` }} /></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 max-w-[180px] truncate">{d.nextStep ?? <span className="text-amber-500/80">sem next step</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{total} total · página {page}</span>
        <Link href="/pipeline" className="text-sky-400 hover:underline">Ver Kanban →</Link>
      </div>
    </div>
  );
}

import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cookies } from "next/headers";
import { t, type Locale, defaultLocale } from "@/lib/i18n";

function fmt(n:number, cur="BRL", locale:Locale="pt-BR"){ return new Intl.NumberFormat(locale,{style:"currency",currency:cur}).format(n); }

export default async function DashboardPage() {
  const { organizationId } = await requireTenant();
  const jar = await cookies();
  const locale = (jar.get("locale")?.value as Locale|undefined) ?? defaultLocale;
  const tr=(k:string)=>t(locale,k);
  const [dealsTotal, companies, callsTotal, tasksTodo, tasksOverdue, pipeline, recentDeals, recentCalls, recentTasks, forecastDeals, staleDeals] = await Promise.all([
    prisma.deal.count({ where:{ organizationId } }),
    prisma.company.count({ where:{ organizationId } }),
    prisma.call.count({ where:{ organizationId } }),
    prisma.task.count({ where:{ organizationId, status:"TODO" } }),
    prisma.task.count({ where:{ organizationId, status:"TODO", dueDate:{ lt: new Date() } } }),
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId }, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.findMany({ where:{ organizationId }, orderBy:{ updatedAt:"desc" }, take:5, select:{ id:true, name:true, stage:true, value:true, currency:true } }),
    prisma.call.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take:5, select:{ id:true, title:true, status:true, createdAt:true } }),
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] } }, orderBy:{ dueDate:"asc" }, take:5, select:{ id:true, title:true, status:true, dueDate:true } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] } }, select:{ value:true, probability:true } }),
    prisma.deal.findMany({ where:{ organizationId, updatedAt:{ lt: new Date(Date.now()-7*86400000) }, stage:{ notIn:["WON","LOST"] } }, select:{ id:true, name:true, updatedAt:true }, take:5 }),
  ]);
  const pipelineValue = pipeline.reduce((a,b)=>a+Number(b._sum.value??0),0);
  const forecast = forecastDeals.reduce((a,d)=>a+ Number(d.value??0)*( (d.probability??30)/100 ),0);
  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const pipelineSorted=[...pipeline].sort((a,b)=>stageOrder.indexOf(a.stage)-stageOrder.indexOf(b.stage));

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">{tr("dashboard.title")}</h1><p className="mt-1 text-sm text-zinc-400">{tr("dashboard.subtitle")}</p></div>

      {staleDeals.length>0 && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 flex items-center justify-between">
          <div><p className="text-sm font-medium text-amber-300">⚠️ {staleDeals.length} deals parados há 7+ dias sem atualização</p><p className="text-xs text-zinc-400">{staleDeals.map(d=>d.name).join(" · ")}</p></div>
          <Link href="/pipeline" className="text-xs text-sky-400 hover:underline">Ver pipeline →</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">{tr("dashboard.pipeline")}</p><p className="mt-1 text-xl font-semibold">{fmt(pipelineValue,"BRL",locale)}</p><p className="text-xs text-zinc-500">{dealsTotal} deals</p></div>
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Forecast (weighted)</p><p className="mt-1 text-xl font-semibold text-emerald-400">{fmt(forecast,"BRL",locale)}</p><p className="text-xs text-zinc-500">prob. médio</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">{tr("dashboard.companies")}</p><p className="mt-1 text-xl font-semibold">{companies}</p><p className="text-xs text-zinc-500">{locale==="en"?"active accounts":"contas ativas"}</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">{tr("dashboard.calls")}</p><p className="mt-1 text-xl font-semibold">{callsTotal}</p><p className="text-xs text-zinc-500">{locale==="en"?"total recorded":"total gravadas"}</p></div>
        <div className={`rounded-xl border p-5 ${tasksOverdue>0?"border-amber-900/50 bg-amber-950/20":"border-zinc-800 bg-zinc-900"}`}><p className="text-xs uppercase tracking-wide text-zinc-500">{tr("dashboard.tasks")}</p><p className="mt-1 text-xl font-semibold">{tasksTodo} <span className="text-sm font-normal text-zinc-500">{tr("dashboard.pending")}</span></p><p className="text-xs text-amber-400">{tasksOverdue>0?`${tasksOverdue} ${tr("dashboard.overdue")}`: tr("dashboard.onTime")}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">{tr("dashboard.byStage")}</h2>
          <div className="mt-4 space-y-2">
            {pipelineSorted.length===0 && <p className="text-sm text-zinc-500">{tr("dashboard.noDeals")} <Link href="/deals/new" className="text-sky-400 hover:underline">Criar deal</Link></p>}
            {pipelineSorted.map(s=>(
              <div key={s.stage} className="flex items-center gap-3">
                <span className="w-36 text-xs text-zinc-400">{s.stage}</span>
                <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-sky-600" style={{ width: `${Math.max(6, (s._count.stage/dealsTotal)*100)}%` }} /></div>
                <span className="w-10 text-xs text-zinc-500">{s._count.stage}</span>
                <span className="w-24 text-right text-xs text-zinc-400">{fmt(Number(s._sum.value??0),"BRL",locale)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">{tr("dashboard.recentDeals")}</h2>
          <div className="mt-3 space-y-2">
            {recentDeals.length===0 && <p className="text-sm text-zinc-500">{tr("dashboard.noDeals")}</p>}
            {recentDeals.map(d=>(
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                <span className="text-sm text-zinc-100">{d.name}</span><span className="flex items-center gap-2"><Badge>{d.stage}</Badge><span className="text-xs text-zinc-400">{d.value?fmt(Number(d.value),d.currency,locale):"—"}</span></span>
              </Link>
            ))}
          </div>
          <Link href="/pipeline" className="mt-3 inline-block text-xs text-sky-400 hover:underline">{tr("dashboard.viewPipeline")}</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">{tr("dashboard.recentCalls")}</h2>
          <div className="mt-3 space-y-2">
            {recentCalls.length===0 && <p className="text-sm text-zinc-500">{tr("dashboard.noCalls")} <Link href="/calls/new" className="text-sky-400 hover:underline">Nova call</Link></p>}
            {recentCalls.map(c=>(
              <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                <span className="text-sm text-zinc-100">{c.title}</span><span className="text-xs text-zinc-500">{c.status} · {new Date(c.createdAt).toLocaleDateString(locale)}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex gap-2"><Link href="/calls" className="text-xs text-sky-400 hover:underline">{tr("dashboard.viewCalls")}</Link><Link href="/live" className="text-xs text-sky-400 hover:underline">Live Coach →</Link></div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">{tr("dashboard.pendingTasks")}</h2>
          <div className="mt-3 space-y-2">
            {recentTasks.length===0 && <p className="text-sm text-zinc-500">{tr("dashboard.noTasks")}</p>}
            {recentTasks.map(t=>(
              <div key={t.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-sm text-zinc-200">{t.title}</span><span className="flex items-center gap-2"><Badge>{t.status}</Badge><span className="text-xs text-zinc-500">{t.dueDate? new Date(t.dueDate).toLocaleDateString(locale):"—"}</span></span>
              </div>
            ))}
          </div>
          <Link href="/tasks" className="mt-3 inline-block text-xs text-sky-400 hover:underline">{tr("dashboard.viewTasks")}</Link>
        </div>
      </div>
    </div>
  );
}

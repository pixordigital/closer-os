import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getOrgRole } from "@/lib/permissions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cookies } from "next/headers";
import { t, type Locale, defaultLocale } from "@/lib/i18n";

function fmt(n:number, cur="BRL", locale:Locale="pt-BR"){ return new Intl.NumberFormat(locale,{style:"currency",currency:cur}).format(n); }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const { organizationId, userId } = await requireTenant();
  const role = await getOrgRole(userId, organizationId);
  const sp = await searchParams;
  const ownerIdParam = (sp.ownerId ?? "").trim() || undefined;
  const scopeMine = (sp.mine ?? "").trim().toLowerCase();
  let ownerId: string|undefined = scopeMine==="1" || scopeMine==="true" ? userId : (ownerIdParam || undefined);
  if (role==="MEMBER") ownerId = userId;
  const whereOwner = ownerId ? { organizationId, ownerId } : { organizationId };
  const jar = await cookies();
  const locale = (jar.get("locale")?.value as Locale|undefined) ?? defaultLocale;
  const tr=(k:string)=>t(locale,k);
  const members = role!=="MEMBER" ? await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{ id:true, name:true } } } }) : [];
  const [dealsTotal, companies, callsTotal, tasksTodo, tasksOverdue, pipeline, recentDeals, recentCalls, recentTasks, forecastDeals, staleDeals, ranking, wonLost, noNextStep, lostReasons, velocityRaw] = await Promise.all([
    prisma.deal.count({ where: whereOwner }),
    prisma.company.count({ where:{ organizationId } }),
    prisma.call.count({ where:{ organizationId } }),
    prisma.task.count({ where:{ organizationId, status:"TODO" } }),
    prisma.task.count({ where:{ organizationId, status:"TODO", dueDate:{ lt: new Date() } } }),
    prisma.deal.groupBy({ by:["stage"], where: whereOwner, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.findMany({ where: whereOwner, orderBy:{ updatedAt:"desc" }, take:5, select:{ id:true, name:true, stage:true, value:true, currency:true } }),
    prisma.call.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take:5, select:{ id:true, title:true, status:true, createdAt:true } }),
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] } }, orderBy:{ dueDate:"asc" }, take:5, select:{ id:true, title:true, status:true, dueDate:true } }),
    prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:{ notIn:["WON","LOST"] } } as never, select:{ value:true, probability:true } }),
    prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), updatedAt:{ lt: new Date(Date.now()-7*86400000) }, stage:{ notIn:["WON","LOST"] } } as never, select:{ id:true, name:true, updatedAt:true }, take:5 }),
    prisma.deal.groupBy({ by:["ownerId"], where:{ organizationId, stage:{ notIn:["LOST"] } } as never, _count:{ ownerId:true }, _sum:{ value:true } }),
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId, stage:{ in:["WON","LOST"] } } as never, _count:{ stage:true } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] }, OR:[{nextStep:null},{nextStepDate:null}] } as never, select:{ id:true, name:true, stage:true }, take:5 }),
    prisma.deal.groupBy({ by:["lostReason"], where:{ organizationId, stage:"LOST", lostReason:{ not:null } } as never, _count:{ lostReason:true } }),
    prisma.deal.findMany({ where: whereOwner, select:{ createdAt:true, updatedAt:true, stage:true } }),
  ]);
  const pipelineValue = pipeline.reduce((a,b)=>a+Number(b._sum.value??0),0);
  const forecast = forecastDeals.reduce((a,d)=>a+ Number((d as {value:unknown}).value??0)*( ((d as {probability:number|null}).probability??30)/100 ),0);
  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const pipelineSorted=[...pipeline].sort((a,b)=>stageOrder.indexOf(a.stage as string)-stageOrder.indexOf(b.stage as string));
  const period=new Date().toISOString().slice(0,7);
  const memberNameMap=new Map(members.map(m=>[m.userId, m.user.name]));
  const rankingSorted=[...ranking].filter(r=>r.ownerId).sort((a,b)=>(b._count.ownerId??0)-(a._count.ownerId??0)).slice(0,5);
  const wonCount=wonLost.find(w=>w.stage==="WON")?._count.stage ?? 0;
  const lostCount=wonLost.find(w=>w.stage==="LOST")?._count.stage ?? 0;
  const convRate = (wonCount+lostCount)>0 ? Math.round(wonCount/(wonCount+lostCount)*100) : null;
  const velocityDays = velocityRaw.length ? Math.round(velocityRaw.reduce((a,d)=>a+(new Date(d.updatedAt).getTime()-new Date(d.createdAt).getTime())/86400000,0)/velocityRaw.length) : null;
  const topLostReasons=[...lostReasons].sort((a,b)=>(b._count.lostReason??0)-(a._count.lostReason??0)).slice(0,3);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">{tr("dashboard.title")}</h1><p className="mt-1 text-sm text-zinc-400">{tr("dashboard.subtitle")} · {role==="MEMBER" ? "seus deals" : ownerId ? "filtrado por closer" : "todos"}</p></div>
        {role!=="MEMBER" && (
          <form className="flex flex-wrap items-center gap-2">
            <select name="ownerId" defaultValue={ownerId ?? ""} className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200">
              <option value="">Todos closers</option>
              {members.map(m=><option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" name="mine" value="1" defaultChecked={scopeMine==="1"||scopeMine==="true"} /> Meus</label>
            <button type="submit" className="h-8 rounded bg-zinc-800 px-3 text-xs text-zinc-200 hover:bg-zinc-700">Filtrar</button>
            {ownerId && <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">Limpar</Link>}
          </form>
        )}
      </div>

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
              <div key={s.stage as string} className="flex items-center gap-3">
                <span className="w-36 text-xs text-zinc-400">{s.stage as string}</span>
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
                <span className="text-sm text-zinc-100">{d.name}</span><span className="flex items-center gap-2"><Badge>{d.stage}</Badge><span className="text-xs text-zinc-400">{d.value?fmt(Number(d.value),d.currency as string,locale):"—"}</span></span>
              </Link>
            ))}
          </div>
          <Link href="/pipeline" className="mt-3 inline-block text-xs text-sky-400 hover:underline">{tr("dashboard.viewPipeline")}</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">{tr("dashboard.pendingTasks")}</h2>
          <div className="mt-3 space-y-2">
            {recentTasks.length===0 && <p className="text-sm text-zinc-500">{tr("dashboard.noTasks")}</p>}
            {recentTasks.map(t=>(
              <div key={t.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-sm text-zinc-200">{t.title}</span><span className="flex items-center gap-2"><Badge>{t.status}</Badge><span className="text-xs text-zinc-500">{t.dueDate? new Date(t.dueDate as unknown as string).toLocaleDateString(locale):"—"}</span></span>
              </div>
            ))}
          </div>
          <Link href="/tasks" className="mt-3 inline-block text-xs text-sky-400 hover:underline">{tr("dashboard.viewTasks")}</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Ranking por closer</h2>
          <p className="text-xs text-zinc-500">Deals ativos · top 5</p>
          <div className="mt-3 space-y-2">
            {rankingSorted.length===0 && <p className="text-sm text-zinc-500">Sem dados</p>}
            {rankingSorted.map(r=>(
              <div key={r.ownerId as string} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-sm text-zinc-100">{memberNameMap.get(r.ownerId as string) ?? (r.ownerId as string).slice(0,8)}</span>
                <span className="flex items-center gap-3 text-xs"><span className="text-zinc-400">{r._count.ownerId} deals</span><span className="font-medium text-zinc-200">{fmt(Number(r._sum.value ?? 0),"BRL",locale)}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Conversão & Velocity</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-950 p-3 text-center"><p className="text-xs text-zinc-500">WON</p><p className="text-lg font-semibold text-emerald-400">{wonCount}</p></div>
            <div className="rounded-lg bg-zinc-950 p-3 text-center"><p className="text-xs text-zinc-500">LOST</p><p className="text-lg font-semibold text-red-400">{lostCount}</p></div>
            <div className="rounded-lg bg-zinc-950 p-3 text-center"><p className="text-xs text-zinc-500">Conv.</p><p className="text-lg font-semibold">{convRate!==null?`${convRate}%`:"—"}</p></div>
          </div>
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Velocity médio (criação → último update)</p><p className="text-sm font-medium text-zinc-200">{velocityDays!==null?`${velocityDays} dias`:"—"}</p>
          </div>
          <div className="mt-3">
            <p className="text-xs text-zinc-500">Top motivos de perda</p>
            {topLostReasons.length===0 && <p className="text-xs text-zinc-600 mt-1">Sem dados</p>}
            {topLostReasons.map(r=>(
              <div key={r.lostReason as string} className="flex justify-between text-xs text-zinc-400 mt-1"><span className="truncate pr-2">{r.lostReason as string}</span><span>{r._count.lostReason}</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
          <h2 className="font-medium text-amber-300">Sem próximo passo</h2>
          <p className="text-xs text-zinc-500">Bloqueia avanço de estágio</p>
          <div className="mt-3 space-y-2">
            {noNextStep.length===0 && <p className="text-sm text-zinc-500">Tudo com próximo passo ✓</p>}
            {noNextStep.map(d=>(
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-amber-800">
                <span className="text-sm text-zinc-100 truncate pr-2">{d.name}</span><Badge>{d.stage}</Badge>
              </Link>
            ))}
          </div>
          {noNextStep.length>0 && <Link href="/pipeline" className="mt-3 inline-block text-xs text-sky-400 hover:underline">Cobrar no pipeline →</Link>}
        </div>
      </div>
    </div>
  );
}

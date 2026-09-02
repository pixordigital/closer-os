import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function fmt(n:number, cur="BRL"){ return new Intl.NumberFormat("pt-BR",{style:"currency",currency:cur}).format(n); }

export default async function DashboardPage() {
  const { organizationId } = await requireTenant();
  const [dealsTotal, companies, callsTotal, tasksTodo, tasksOverdue, pipeline, recentDeals, recentCalls, recentTasks] = await Promise.all([
    prisma.deal.count({ where:{ organizationId } }),
    prisma.company.count({ where:{ organizationId } }),
    prisma.call.count({ where:{ organizationId } }),
    prisma.task.count({ where:{ organizationId, status:"TODO" } }),
    prisma.task.count({ where:{ organizationId, status:"TODO", dueDate:{ lt: new Date() } } }),
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId }, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.findMany({ where:{ organizationId }, orderBy:{ updatedAt:"desc" }, take:5, select:{ id:true, name:true, stage:true, value:true, currency:true } }),
    prisma.call.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take:5, select:{ id:true, title:true, status:true, createdAt:true } }),
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] } }, orderBy:{ dueDate:"asc" }, take:5, select:{ id:true, title:true, status:true, dueDate:true } }),
  ]);
  const pipelineValue = pipeline.reduce((a,b)=>a+Number(b._sum.value??0),0);
  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const pipelineSorted=[...pipeline].sort((a,b)=>stageOrder.indexOf(a.stage)-stageOrder.indexOf(b.stage));

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-zinc-400">Visão geral do seu pipeline e performance.</p></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Pipeline</p><p className="mt-1 text-2xl font-semibold">{fmt(pipelineValue)}</p><p className="text-xs text-zinc-500">{dealsTotal} deals</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Companies</p><p className="mt-1 text-2xl font-semibold">{companies}</p><p className="text-xs text-zinc-500">contas ativas</p></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Calls</p><p className="mt-1 text-2xl font-semibold">{callsTotal}</p><p className="text-xs text-zinc-500">total gravadas</p></div>
        <div className={`rounded-xl border p-5 ${tasksOverdue>0?"border-amber-900/50 bg-amber-950/20":"border-zinc-800 bg-zinc-900"}`}><p className="text-xs uppercase tracking-wide text-zinc-500">Tasks</p><p className="mt-1 text-2xl font-semibold">{tasksTodo} <span className="text-sm font-normal text-zinc-500">pendentes</span></p><p className="text-xs text-amber-400">{tasksOverdue>0?`${tasksOverdue} vencidas`: "em dia"}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Pipeline por estágio</h2>
          <div className="mt-4 space-y-2">
            {pipelineSorted.length===0 && <p className="text-sm text-zinc-500">Nenhum deal ainda. <Link href="/deals/new" className="text-sky-400 hover:underline">Criar deal</Link></p>}
            {pipelineSorted.map(s=>(
              <div key={s.stage} className="flex items-center gap-3">
                <span className="w-36 text-xs text-zinc-400">{s.stage}</span>
                <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-sky-600" style={{ width: `${Math.max(6, (s._count.stage/dealsTotal)*100)}%` }} /></div>
                <span className="w-10 text-xs text-zinc-500">{s._count.stage}</span>
                <span className="w-24 text-right text-xs text-zinc-400">{fmt(Number(s._sum.value??0))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Deals recentes</h2>
          <div className="mt-3 space-y-2">
            {recentDeals.length===0 && <p className="text-sm text-zinc-500">Nenhum deal.</p>}
            {recentDeals.map(d=>(
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                <span className="text-sm text-zinc-100">{d.name}</span><span className="flex items-center gap-2"><Badge>{d.stage}</Badge><span className="text-xs text-zinc-400">{d.value?fmt(Number(d.value),d.currency):"—"}</span></span>
              </Link>
            ))}
          </div>
          <Link href="/pipeline" className="mt-3 inline-block text-xs text-sky-400 hover:underline">Ver pipeline →</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Calls recentes</h2>
          <div className="mt-3 space-y-2">
            {recentCalls.length===0 && <p className="text-sm text-zinc-500">Nenhuma call. <Link href="/calls/new" className="text-sky-400 hover:underline">Nova call</Link></p>}
            {recentCalls.map(c=>(
              <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                <span className="text-sm text-zinc-100">{c.title}</span><span className="text-xs text-zinc-500">{c.status} · {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex gap-2"><Link href="/calls" className="text-xs text-sky-400 hover:underline">Ver calls →</Link><Link href="/live" className="text-xs text-sky-400 hover:underline">Live Coach →</Link></div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Tasks pendentes</h2>
          <div className="mt-3 space-y-2">
            {recentTasks.length===0 && <p className="text-sm text-zinc-500">Nenhuma task pendente.</p>}
            {recentTasks.map(t=>(
              <div key={t.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-sm text-zinc-200">{t.title}</span><span className="flex items-center gap-2"><Badge>{t.status}</Badge><span className="text-xs text-zinc-500">{t.dueDate? new Date(t.dueDate).toLocaleDateString("pt-BR"):"—"}</span></span>
              </div>
            ))}
          </div>
          <Link href="/tasks" className="mt-3 inline-block text-xs text-sky-400 hover:underline">Ver tasks →</Link>
        </div>
      </div>
    </div>
  );
}

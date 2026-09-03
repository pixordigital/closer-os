import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export default async function ReportsPage() {
  const { organizationId } = await requireTenant();
  const [byStage, total, won, lost, dealsWon, lostReasons] = await Promise.all([
    prisma.deal.groupBy({ by:["stage"], where:{ organizationId }, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.count({ where:{ organizationId } }),
    prisma.deal.count({ where:{ organizationId, stage:"WON" as never } }),
    prisma.deal.count({ where:{ organizationId, stage:"LOST" as never } }),
    prisma.deal.findMany({ where:{ organizationId, stage:"WON" as never }, select:{ createdAt:true, updatedAt:true } }),
    prisma.deal.groupBy({ by:["lostReason"], where:{ organizationId, stage:"LOST" as never, lostReason:{ not: null as never } }, _count:{ lostReason:true } }),
  ]);
  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const sorted=[...byStage].sort((a,b)=> stageOrder.indexOf(a.stage as string)-stageOrder.indexOf(b.stage as string));
  const maxCount=Math.max(1,...sorted.map(s=>s._count.stage));
  const closed=won+lost;
  const winRate=closed?Math.round(won/closed*100):0;
  let avgCycle:number|null=null;
  if(dealsWon.length){ const d=dealsWon.map(x=>(new Date(x.updatedAt).getTime()-new Date(x.createdAt).getTime())/86400000); avgCycle=Math.round(d.reduce((a,b)=>a+b,0)/d.length); }

  const Card=({k,v,sub}:{k:string;v:string;sub?:string})=>(<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">{k}</div><div className="mt-1 text-2xl font-semibold">{v}</div>{sub&&<div className="text-xs text-zinc-500">{sub}</div>}</div>);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1><p className="mt-1 text-sm text-zinc-400">Funnel, ciclo, win rate, motivos de perda — base para gestão.</p></div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card k="Total deals" v={String(total)} />
        <Card k="Win rate" v={`${winRate}%`} sub={`${won} Won · ${lost} Lost`} />
        <Card k="Ciclo médio" v={avgCycle!=null?`${avgCycle}d`:"—"} sub="LEAD→WON" />
        <Card k="Perdidos" v={String(lost)} sub={lost?`${Math.round(lost/Math.max(1,total)*100)}% do total`:"—"} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Funnel por estágio</h2>
        <div className="mt-4 space-y-2">
          {sorted.length===0 && <p className="text-sm text-zinc-500">Sem dados.</p>}
          {sorted.map(s=>(
            <div key={s.stage as string} className="flex items-center gap-3">
              <span className="w-36 text-xs text-zinc-400">{s.stage as string}</span>
              <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-sky-600" style={{ width:`${Math.max(6, s._count.stage/maxCount*100)}%` }} /></div>
              <span className="w-10 text-xs text-zinc-500">{s._count.stage}</span>
              <span className="w-16 text-right text-xs text-zinc-500">{s._count.stage && total ? Math.round(s._count.stage/total*100):0}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Motivos de perda</h2>
        <div className="mt-3 space-y-2">
          {lostReasons.length===0 && <p className="text-sm text-zinc-500">Nenhum LOST com motivo — gate agora exige lostReason.</p>}
          {(lostReasons as unknown as {lostReason:string,_count:{lostReason:number}}[]).map(r=>(
            <div key={r.lostReason} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <span className="text-sm text-zinc-200">{r.lostReason ?? "—"}</span><span className="text-xs text-zinc-500">{r._count.lostReason}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

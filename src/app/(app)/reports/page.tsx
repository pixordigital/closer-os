import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getOrgRole } from "@/lib/permissions";
import Link from "next/link";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const { organizationId, userId } = await requireTenant();
  const sp = await searchParams;
  const role = await getOrgRole(userId, organizationId);
  const ownerIdParam = (sp.ownerId ?? "").trim() || undefined;
  const mine = (sp.mine ?? "").trim().toLowerCase();
  let ownerId: string | undefined = mine === "1" || mine === "true" ? userId : (ownerIdParam || undefined);
  if (role === "MEMBER") ownerId = userId;
  const whereOwner = ownerId ? { organizationId, ownerId } : { organizationId };

  const [byStage, total, won, lost, dealsWon, lostReasons] = await Promise.all([
    prisma.deal.groupBy({ by:["stage"], where: whereOwner, _count:{ stage:true }, _sum:{ value:true } }),
    prisma.deal.count({ where: whereOwner }),
    prisma.deal.count({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"WON" as never } }),
    prisma.deal.count({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"LOST" as never } }),
    prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"WON" as never }, select:{ createdAt:true, updatedAt:true } }),
    prisma.deal.groupBy({ by:["lostReason"], where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:"LOST" as never, lostReason:{ not: null as never } }, _count:{ lostReason:true } }),
  ]);
  const stageOrder=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"];
  const sorted=[...byStage].sort((a,b)=> stageOrder.indexOf(a.stage as string)-stageOrder.indexOf(b.stage as string));
  const maxCount=Math.max(1,...sorted.map(s=>s._count.stage));
  const closed=won+lost;
  const winRate=closed?Math.round(won/closed*100):0;
  let avgCycle:number|null=null;
  if(dealsWon.length){ const d=dealsWon.map(x=>(new Date((x as {updatedAt:Date}).updatedAt).getTime()-new Date((x as {createdAt:Date}).createdAt).getTime())/86400000); avgCycle=Math.round(d.reduce((a,b)=>a+b,0)/d.length); }
  const forecastDeals = await prisma.deal.findMany({ where:{ organizationId, ...(ownerId ? { ownerId } : {}), stage:{ notIn:["WON","LOST"] as never } } as never, select:{ value:true, probability:true } });
  const forecast = forecastDeals.reduce((a, d)=> a + Number((d as {value:unknown}).value ?? 0)*(((d as {probability:number|null}).probability ?? 30)/100),0);

  // per-closer table for gestores
  let perCloser: Array<{ ownerId:string; name:string; deals:number; won:number; forecast:number }> | null = null;
  if (!ownerId && role !== "MEMBER") {
    const members = await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{id:true,name:true}} } });
    const grouped = await prisma.deal.groupBy({ by:["ownerId"], where:{ organizationId, ownerId:{ not:null as never } } as never, _count:{ ownerId:true } });
    const wonBy = await prisma.deal.groupBy({ by:["ownerId"], where:{ organizationId, stage:"WON" as never } as never, _count:{ ownerId:true } });
    const forecastBy: Record<string,number> = {};
    for (const d of await prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] as never } } as never, select:{ ownerId:true, value:true, probability:true } }) as unknown as Array<{ownerId:string|null;value:unknown;probability:number|null}>) {
      if(!d.ownerId) continue;
      forecastBy[d.ownerId] = (forecastBy[d.ownerId]??0) + Number(d.value??0)*((d.probability??30)/100);
    }
    const countMap = new Map(grouped.map(r=>[(r as {ownerId:string}).ownerId, (r as unknown as {_count:{ownerId:number}})._count.ownerId] as const));
    const wonMap = new Map(wonBy.map(r=>[(r as {ownerId:string}).ownerId, (r as unknown as {_count:{ownerId:number}})._count.ownerId] as const));
    perCloser = members.map(m=>({
      ownerId: m.userId,
      name: m.user.name,
      deals: countMap.get(m.userId) ?? 0,
      won: wonMap.get(m.userId) ?? 0,
      forecast: Math.round(forecastBy[m.userId] ?? 0),
    }));
  }

  const Card=({k,v,sub}:{k:string;v:string;sub?:string})=>(<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">{k}</div><div className="mt-1 text-2xl font-semibold">{v}</div>{sub&&<div className="text-xs text-zinc-500">{sub}</div>}</div>);
  const members = role!=="MEMBER" ? await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{id:true,name:true}} } }) : [];

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1><p className="mt-1 text-sm text-zinc-400">{ownerId ? "Filtrado por closer" : "Funnel, ciclo, win rate, forecast vs quota"} · {role==="MEMBER" ? "seus dados" : "gestão"}</p></div>
        {role!=="MEMBER" && (
          <form className="flex flex-wrap items-center gap-2">
            <select name="ownerId" defaultValue={ownerId ?? ""} className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200">
              <option value="">Todos closers</option>
              {members.map(m=><option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" name="mine" value="1" defaultChecked={mine==="1"||mine==="true"} /> Meus</label>
            <button type="submit" className="h-8 rounded bg-zinc-800 px-3 text-xs text-zinc-200 hover:bg-zinc-700">Filtrar</button>
            {ownerId && <Link href="/reports" className="text-xs text-zinc-500 hover:text-zinc-300">Limpar</Link>}
          </form>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card k="Total deals" v={String(total)} />
        <Card k="Win rate" v={`${winRate}%`} sub={`${won} Won · ${lost} Lost`} />
        <Card k="Ciclo médio" v={avgCycle!=null?`${avgCycle}d`:"—"} sub="LEAD→WON" />
        <Card k="Forecast" v={new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(forecast)} />
        <Card k="Perdidos" v={String(lost)} sub={lost?`${Math.round(lost/Math.max(1,total)*100)}%`:"—"} />
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

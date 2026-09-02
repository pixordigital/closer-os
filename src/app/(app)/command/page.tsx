import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { computeDealRisk } from "@/lib/deal-risk";
import { Badge } from "@/components/ui/badge";
import { AskPanel } from "@/components/command/ask-panel";

export default async function CommandPage() {
  const { organizationId, userId } = await requireTenant();

  const [deals, calls, followUps, skills, coaching, scenarios] = await Promise.all([
    prisma.deal.findMany({
      where: { organizationId, stage: { notIn: ["WON","LOST"] as never } },
      include: { discoveryFields: { select:{key:true,status:true}}, company:{select:{name:true}}, _count:{select:{objections:true}} },
      take: 100, orderBy:{ updatedAt:"desc" },
    }),
    prisma.call.findMany({ where:{ organizationId }, take: 6, orderBy:{ createdAt:"desc" }, select:{ id:true, title:true, scheduledAt:true, status:true, dealId:true } }),
    prisma.followUp.findMany({ where:{ organizationId, status:{ in:["DRAFT","PENDING_REVIEW"] as never } }, take: 6, orderBy:{ createdAt:"desc" }, select:{ id:true, type:true, subject:true, status:true, dealId:true } }),
    prisma.sellerSkill.findMany({ where:{ userId }, orderBy:{ currentScore:"asc" }, take: 3 }),
    prisma.coachingSession.findMany({ where:{ organizationId, userId }, orderBy:{ createdAt:"desc" }, take: 1 }),
    prisma.roleplayScenario.findMany({ where:{ OR:[{organizationId},{organizationId:null}] }, take: 4, select:{ id:true, title:true, trainingObjective:true, difficulty:true } }),
  ]);

  const compSet = new Set((await prisma.objection.findMany({ where:{ organizationId, category:"COMPETITION" as never }, select:{ dealId:true } })).map(o=>o.dealId).filter(Boolean) as string[]);
  const dealRisks = deals.map(d=>({ id:d.id, name:d.name, company:d.company?.name ?? null, stage:String(d.stage), risk: computeDealRisk({ discoveryFields:d.discoveryFields, deal:{nextStep:d.nextStep, updatedAt:d.updatedAt, stage:String(d.stage)}, objectionsCount:d._count.objections, hasCompetitorObjection: compSet.has(d.id) } as never) })).sort((a,b)=>b.risk.score-a.risk.score);
  const highRisk = dealRisks.filter(d=>d.risk.level==="high").slice(0,5);
  const upcoming = calls.filter(c=>c.scheduledAt && new Date(c.scheduledAt) >= new Date()).slice(0,5);
  const weakest = skills.map(s=>s.skill);

  const briefLines = [
    upcoming.length ? `${upcoming.length} call(s) agendada(s) hoje.` : "Sem calls agendadas hoje.",
    followUps.length ? `${followUps.length} follow-up(s) pendente(s).` : "Follow-ups em dia.",
    highRisk.length ? `Risco alto: ${highRisk.map(d=>d.name).join(", ")}.` : "Nenhum deal em risco alto.",
    weakest.length ? `Treino: ${weakest.join(", ")} — 1 Executive Discovery Roleplay sugerido.` : "Faça 1 roleplay para calibrar skills.",
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Command Center (§74)</h1>
        <p className="mt-1 text-sm text-zinc-400">Today&apos;s Focus · Deal Risks · Upcoming Calls · Follow-ups · Coaching · Roleplays</p>
      </div>

      {/* Daily Brief §75 */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium">Daily Closer Brief</h2>
        <p className="mt-1 text-sm text-zinc-300">Bom dia. {briefLines.join(" ")}</p>
        {coaching[0]?.summary && <p className="mt-2 text-xs text-zinc-500">Coaching: {coaching[0].summary.slice(0,200)}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium">Deal Risks (§76)</h3>
          {dealRisks.length===0 ? <p className="mt-2 text-sm text-zinc-500">Sem deals ativos.</p> : (
            <ul className="mt-3 space-y-2">
              {dealRisks.slice(0,6).map(d=>(
                <li key={d.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <div>
                    <Link href={`/deals/${d.id}`} className="text-sm font-medium text-zinc-100 hover:underline">{d.name}</Link>
                    <div className="text-xs text-zinc-500">{d.company ?? "—"} · {d.stage} · {d.risk.reasons.slice(0,2).join(" · ") || "ok"}</div>
                  </div>
                  <Badge className={d.risk.level==="high" ? "bg-red-900/40 text-red-300 border-red-800" : d.risk.level==="medium" ? "bg-amber-900/30 text-amber-300 border-amber-800" : "bg-zinc-800 text-zinc-400"}>{d.risk.score} · {d.risk.level}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/api/deals/risk" className="mt-2 inline-block text-xs text-sky-400 hover:underline">API /api/deals/risk →</Link>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium">Upcoming Calls</h3>
          {calls.length===0 ? <p className="mt-2 text-sm text-zinc-500">Sem calls.</p> : (
            <ul className="mt-3 space-y-2">
              {calls.map(c=>(
                <li key={c.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <Link href={`/calls/${c.id}`} className="text-sm text-zinc-100 hover:underline">{c.title}</Link>
                  <div className="text-xs text-zinc-500">{c.status}{c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString("pt-BR")}` : ""}</div>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 text-sm font-medium">Pending Follow-ups</h3>
          {followUps.length===0 ? <p className="mt-2 text-sm text-zinc-500">Nenhum pendente.</p> : (
            <ul className="mt-2 space-y-1">
              {followUps.map(f=>(
                <li key={f.id} className="text-sm text-zinc-300">{f.type} · {f.subject ?? "—"} <Badge className="ml-2">{f.status}</Badge></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium">Recommended Roleplays</h3>
        <p className="mt-1 text-xs text-zinc-500">Baseado em weakest skills: {weakest.join(", ") || "—"}.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scenarios.map(s=>(
            <Link key={s.id} href={`/roleplay/${s.id}`} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <div className="text-sm text-zinc-100">{s.title}</div>
              <div className="text-xs text-zinc-500">{String(s.difficulty)} · {s.trainingObjective ?? "—"}</div>
            </Link>
          ))}
        </div>
      </section>

      <AskPanel />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium">Search (§78-79)</h3>
        <p className="mt-1 text-xs text-zinc-500">Busca global + semântica (embeddings via provider.embed; lexical fallback). pgvector preparado — adicione coluna vector quando habilitar embeddings persistidos.</p>
        <form action="/search" method="get" className="mt-3 flex gap-2">
          <input name="q" placeholder="Buscar companies, deals, transcripts..." className="h-9 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
          <label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" name="semantic" value="true" /> semantic</label>
          <button type="submit" className="h-9 rounded-md bg-zinc-800 px-4 text-sm text-zinc-100">Search</button>
        </form>
      </section>
    </div>
  );
}

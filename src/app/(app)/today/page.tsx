import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TodayPage() {
  const { organizationId } = await requireTenant();
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setHours(23,59,59,999);
  const staleCut = new Date(Date.now() - 7*86400000);

  const [overdue, dueToday, noNextStep, stale, callsToday, pendingFollowUps] = await Promise.all([
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] as never }, dueDate:{ lt: start } }, orderBy:{ dueDate:"asc" }, take:20, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.task.findMany({ where:{ organizationId, status:{ in:["TODO","IN_PROGRESS"] as never }, dueDate:{ gte: start, lte: end } }, orderBy:{ dueDate:"asc" }, take:20, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] as never }, OR:[{ nextStep:null },{ nextStep:"" }] }, orderBy:{ updatedAt:"desc" }, take:20, select:{ id:true, name:true, stage:true, value:true, currency:true, company:{ select:{ name:true } } } }),
    prisma.deal.findMany({ where:{ organizationId, stage:{ notIn:["WON","LOST"] as never }, updatedAt:{ lt: staleCut } }, orderBy:{ value:"desc" }, take:20, select:{ id:true, name:true, stage:true, value:true, currency:true, updatedAt:true, company:{ select:{ name:true } } } }),
    prisma.call.findMany({ where:{ organizationId, scheduledAt:{ gte: start, lte: end } }, orderBy:{ scheduledAt:"asc" }, take:20, select:{ id:true, title:true, status:true, scheduledAt:true, deal:{ select:{ id:true, name:true } } } }),
    prisma.followUp.findMany({ where:{ organizationId, status:{ in:["DRAFT","PENDING_REVIEW"] as never } }, orderBy:{ createdAt:"desc" }, take:10, include:{ deal:{ select:{ id:true, name:true } } } }),
  ]);

  const Section = ({ title, count, children, tone }: { title:string; count:number; children:React.ReactNode; tone?:string }) => (
    <section className={`rounded-xl border p-4 ${tone ?? "border-zinc-800 bg-zinc-900"}`}>
      <div className="flex items-center justify-between"><h2 className="font-medium text-zinc-100">{title}</h2><Badge>{count}</Badge></div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
        <p className="mt-1 text-sm text-zinc-400">Seu dia em um lugar — atrasadas, hoje, sem próximo passo, paradas, calls do dia.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Atrasadas" count={overdue.length} tone={overdue.length ? "border-amber-900/50 bg-amber-950/20" : "border-zinc-800 bg-zinc-900"}>
          {overdue.length===0 && <p className="text-sm text-zinc-500">Nada atrasado ✓</p>}
          {overdue.map(t=>(
            <Link key={t.id} href={`/tasks/${t.id}/edit`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{t.title}</span>
              <span className="text-xs text-amber-400">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "—"} {t.deal ? `· ${t.deal.name}` : ""}</span>
            </Link>
          ))}
          {overdue.length>0 && <Link href="/tasks?due=overdue" className="text-xs text-sky-400 hover:underline">Ver todas atrasadas →</Link>}
        </Section>

        <Section title="Vencem hoje" count={dueToday.length}>
          {dueToday.length===0 && <p className="text-sm text-zinc-500">Nada para hoje.</p>}
          {dueToday.map(t=>(
            <Link key={t.id} href={`/tasks/${t.id}/edit`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{t.title}</span>
              <span className="text-xs text-zinc-500">{t.deal ? t.deal.name : "—"}</span>
            </Link>
          ))}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Deals sem próximo passo" count={noNextStep.length} tone={noNextStep.length ? "border-amber-900/40 bg-amber-950/10" : "border-zinc-800 bg-zinc-900"}>
          {noNextStep.length===0 && <p className="text-sm text-zinc-500">Todos com next step ✓</p>}
          {noNextStep.map(d=>(
            <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{d.name} <span className="text-zinc-500">· {d.company.name}</span></span>
              <Badge>{d.stage}</Badge>
            </Link>
          ))}
        </Section>

        <Section title="Parados 7+ dias (por valor)" count={stale.length}>
          {stale.length===0 && <p className="text-sm text-zinc-500">Nenhum parado.</p>}
          {stale.map(d=>(
            <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{d.name} <span className="text-zinc-500">· {d.company.name}</span></span>
              <span className="text-xs text-zinc-400">{d.value ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:d.currency}).format(Number(d.value)) : "—"}</span>
            </Link>
          ))}
          {stale.length>0 && <Link href="/pipeline" className="text-xs text-sky-400 hover:underline">Ver pipeline →</Link>}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Calls hoje" count={callsToday.length}>
          {callsToday.length===0 && <p className="text-sm text-zinc-500">Nenhuma call agendada hoje.</p>}
          {callsToday.map(c=>(
            <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{c.title}</span>
              <span className="text-xs text-zinc-500">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""} · {c.status}</span>
            </Link>
          ))}
          <Link href="/calls/new" className="text-xs text-sky-400 hover:underline">+ Nova call</Link>
        </Section>

        <Section title="Follow-ups pendentes" count={pendingFollowUps.length}>
          {pendingFollowUps.length===0 && <p className="text-sm text-zinc-500">Nada pendente.</p>}
          {pendingFollowUps.map(f=>(
            <Link key={f.id} href={`/follow-ups`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
              <span className="text-sm text-zinc-100">{f.subject ?? f.type} <span className="text-zinc-500">· {f.deal.name}</span></span>
              <Badge>{f.status}</Badge>
            </Link>
          ))}
        </Section>
      </div>

      <div className="flex gap-2">
        <Link href="/tasks/new"><Button size="sm">+ Nova task</Button></Link>
        <Link href="/deals/new"><Button variant="outline" size="sm">+ Novo deal</Button></Link>
      </div>
    </div>
  );
}

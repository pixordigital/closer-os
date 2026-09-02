import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function RoleplayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId, userId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const difficulty = (sp.difficulty ?? "").trim().toUpperCase() || undefined;

  const scenarioWhere: Record<string, unknown> = {
    OR: [{ organizationId }, { organizationId: null }],
    ...(difficulty ? { difficulty } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  // when q present, need AND to keep org filter — simpler: fetch via prisma raw where with AND
  const whereForQuery = q
    ? { AND: [{ OR: [{ organizationId }, { organizationId: null }] }, ...(difficulty ? [{ difficulty }] : []), { title: { contains: q, mode: "insensitive" as const } }] }
    : { OR: [{ organizationId }, { organizationId: null }], ...(difficulty ? { difficulty } : {}) };

  const [scenarios, sessions] = await Promise.all([
    prisma.roleplayScenario.findMany({ where: whereForQuery as never, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.roleplaySession.findMany({ where: { organizationId, userId } as never, orderBy: { createdAt: "desc" }, take: 10, include: { scenario: { select: { title: true, persona: true } }, evaluation: { select: { overallScore: true } } } }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roleplay</h1>
          <p className="mt-1 text-sm text-zinc-400">Cenários + simulação prospect adaptativo + avaliação (§45-67)</p>
        </div>
        <Link href="/roleplay/new"><Button size="sm">+ Novo cenário</Button></Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar cenário..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="difficulty" defaultValue={difficulty ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todas dificuldades</option>
          {["LEVEL_1","LEVEL_2","LEVEL_3","LEVEL_4","LEVEL_5","LEVEL_6","LEVEL_7","BOSS"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-medium">Cenários ({scenarios.length})</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {scenarios.length===0 && <p className="text-sm text-zinc-500">Nenhum cenário. Crie um ou use seed.</p>}
            {scenarios.map(s=>(
              <Link key={s.id} href={`/roleplay/${s.id}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700">
                <div className="flex items-center gap-2"><Badge>{s.difficulty}</Badge><span className="text-xs text-zinc-500">{s.persona}</span>{s.organizationId ? null : <span className="text-[11px] text-zinc-600">global</span>}</div>
                <div className="mt-2 font-medium leading-tight text-zinc-100">{s.title}</div>
                <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{s.publicContext.slice(0,120)}</div>
                {s.trainingObjective && <div className="mt-2 text-[11px] text-sky-400">{s.trainingObjective}</div>}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-medium">Minhas sessões</h2>
          <div className="mt-3 space-y-2">
            {sessions.length===0 && <p className="text-sm text-zinc-500">Nenhuma sessão ainda.</p>}
            {sessions.map(sess=>(
              <Link key={sess.id} href={`/roleplay/sessions/${sess.id}`} className="block rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-700">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-100">{sess.scenario.title}</span><Badge>{sess.status}</Badge></div>
                <div className="text-xs text-zinc-500">{sess.scenario.persona} · {new Date(sess.createdAt).toLocaleDateString("pt-BR")} {sess.evaluation ? `· ${sess.evaluation.overallScore}/100` : ""}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

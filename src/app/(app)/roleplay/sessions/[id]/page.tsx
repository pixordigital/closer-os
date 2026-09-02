import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionRunner } from "@/components/roleplay/session-runner";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const session = await prisma.roleplaySession.findFirst({
    where: { id, organizationId, userId },
    include: { scenario: true, messages: { orderBy: { timestamp: "asc" } }, evaluation: true },
  });
  if (!session) notFound();

  const evalData = session.evaluation as unknown as {
    overallScore: number; skills: Record<string, number>; strengths: string[]; weaknesses: string[];
    decisiveMoments: { prospectStatement: string; whatWasMissed: string; recommendedQuestion: string; severity: string }[];
    errorTypes: string[]; recommendedExercises: string[];
  } | null;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Badge>{session.status}</Badge>{session.overallScore != null && <span className="text-sm font-semibold text-zinc-100">{session.overallScore}/100</span>}<Badge>{session.scenario.difficulty}</Badge><span className="text-xs text-zinc-500">{session.scenario.persona}</span></div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{session.scenario.title}</h1>
          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{session.scenario.publicContext.slice(0, 200)}</p>
        </div>
        <Link href="/roleplay"><Button variant="ghost" size="sm">← Roleplay</Button></Link>
      </div>

      <div className="mt-6">
        <SessionRunner sessionId={session.id} initialMessages={session.messages as never} isActive={session.status === "ACTIVE"} />
      </div>

      {evalData && (
        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
          <h2 className="font-medium">Evaluation — {evalData.overallScore}/100</h2>
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            {Object.entries(evalData.skills ?? {}).map(([k, v])=>(
              <div key={k} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="text-xs uppercase tracking-wide text-zinc-500">{k}</div><div className="text-lg font-semibold">{Math.round(v as number)}</div></div>
            ))}
          </div>
          {evalData.strengths?.length>0 && <div><div className="text-xs uppercase tracking-wide text-emerald-400">Strengths</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-300">{evalData.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
          {evalData.weaknesses?.length>0 && <div><div className="text-xs uppercase tracking-wide text-amber-400">Weaknesses</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-300">{evalData.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
          {evalData.decisiveMoments?.length>0 && (
            <div><div className="text-xs uppercase tracking-wide text-zinc-400">Decisive moments</div>
              <div className="mt-2 space-y-2">{evalData.decisiveMoments.map((m,i)=>(
                <div key={i} className="rounded-md border border-amber-900/30 bg-amber-950/20 px-3 py-2">
                  <div className="text-xs text-zinc-400">Prospect: “{m.prospectStatement}”</div>
                  <div className="text-sm text-zinc-200">Missed: {m.whatWasMissed}</div>
                  <div className="text-sm text-sky-300">→ {m.recommendedQuestion}</div>
                  <div className="text-[11px] text-zinc-500">{m.severity}</div>
                </div>
              ))}</div>
            </div>
          )}
          {evalData.recommendedExercises?.length>0 && <div><div className="text-xs uppercase tracking-wide text-sky-400">Recommended exercises</div><ul className="mt-1 list-disc pl-5 text-sm text-zinc-200">{evalData.recommendedExercises.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
        </section>
      )}
    </div>
  );
}

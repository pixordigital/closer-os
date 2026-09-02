import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranscriptEditor } from "@/components/calls/transcript-editor";
import { AnalyzeCallButton } from "@/components/ai/analyze-call-button";
import { FollowUpPanel } from "@/components/ai/follow-up-panel";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const call = await prisma.call.findFirst({
    where: { id, organizationId },
    include: { deal: { select: { id: true, name: true } }, transcript: true },
  });
  if (!call) notFound();

  const insights = await prisma.aIInsight.findMany({
    where: { callId: id, organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{call.status}</Badge>
            <span className="text-xs text-zinc-500">{call.analysisStatus}</span>
            {call.duration ? <span className="text-xs text-zinc-500">{Math.round(call.duration / 60)} min</span> : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{call.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {call.deal ? <><Link href={`/deals/${call.deal.id}`} className="hover:underline text-zinc-200">{call.deal.name}</Link> · </> : null}
            {call.scheduledAt ? new Date(call.scheduledAt).toLocaleString("pt-BR") : "sem agendamento"}
            {" · "}criada {new Date(call.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/calls/${call.id}/edit`}><Button variant="outline" size="sm">Editar</Button></Link>
          <Link href="/calls"><Button variant="ghost" size="sm">← Calls</Button></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Detalhes</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="text-zinc-200">{call.status}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Analysis</dt><dd className="text-zinc-200">{call.analysisStatus}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Duração</dt><dd className="text-zinc-200">{call.duration ? `${call.duration}s` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Deal</dt><dd className="text-zinc-200">{call.deal ? <Link href={`/deals/${call.deal.id}`} className="text-sky-400 hover:underline">{call.deal.name}</Link> : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Agendada</dt><dd className="text-zinc-200">{call.scheduledAt ? new Date(call.scheduledAt).toLocaleString("pt-BR") : "—"}</dd></div>
          </dl>
          <div className="mt-4">
            <AnalyzeCallButton callId={call.id} hasTranscript={!!call.transcript?.content?.trim()} />
          </div>
          {insights.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Insights ({insights.length})</h3>
              {insights.map((ins) => (
                <div key={ins.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center gap-2"><span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">{ins.type}</span>{ins.confidence != null && <span className="text-[11px] text-zinc-500">{Math.round(ins.confidence * 100)}%</span>}</div>
                  <div className="mt-1 text-sm font-medium text-zinc-100">{ins.title}</div>
                  {ins.evidence && <div className="mt-1 text-xs italic text-zinc-400">“{ins.evidence}”</div>}
                  {ins.whyItMatters && <div className="mt-1 text-xs text-zinc-500">{ins.whyItMatters}</div>}
                  {ins.recommendedAction && <div className="mt-1 text-xs text-sky-300">→ {ins.recommendedAction}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Transcript</h2>
          <p className="text-xs text-zinc-500 mt-1">Texto corrido. speakerSegments opcional via API.</p>
          <div className="mt-3">
            <TranscriptEditor callId={call.id} initial={{ content: call.transcript?.content ?? null, language: call.transcript?.language ?? null }} />
          </div>
        </section>
      </div>

      <div className="mt-6">
        <FollowUpPanel callId={call.id} dealId={call.dealId} />
      </div>
    </div>
  );
}

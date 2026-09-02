import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranscriptEditor } from "@/components/calls/transcript-editor";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const call = await prisma.call.findFirst({
    where: { id, organizationId },
    include: { deal: { select: { id: true, name: true } }, transcript: true },
  });
  if (!call) notFound();

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
          <p className="mt-4 text-xs text-zinc-500">Análise IA (insights, discovery auto-fill) chega na Phase 5. Este MVP armazena transcript manual.</p>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Transcript</h2>
          <p className="text-xs text-zinc-500 mt-1">Texto corrido. speakerSegments opcional via API.</p>
          <div className="mt-3">
            <TranscriptEditor callId={call.id} initial={{ content: call.transcript?.content ?? null, language: call.transcript?.language ?? null }} />
          </div>
        </section>
      </div>
    </div>
  );
}

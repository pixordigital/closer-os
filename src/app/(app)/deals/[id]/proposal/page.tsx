import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";

function fmt(v: unknown, cur: string) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(Number(v));
}

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const deal = await prisma.deal.findFirst({
    where: { id, organizationId },
    include: { company: true, primaryContact: true },
  });
  if (!deal) notFound();
  const org = await prisma.organization.findFirst({ where:{ id: organizationId }, select:{ name:true } });

  return (
    <div className="p-6 sm:p-8 print:p-0">
      <div className="mb-4 flex gap-2 print:hidden">
        <PrintButton />
        <Link href={`/deals/${deal.id}`}><Button variant="outline" size="sm">Voltar ao deal</Button></Link>
      </div>
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-white p-8 text-zinc-900 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">{org?.name ?? "Closer OS"}</div>
            <h1 className="mt-1 text-2xl font-bold">Proposta Comercial</h1>
            <p className="mt-1 text-sm text-zinc-500">Deal: {deal.name} · {new Date().toLocaleDateString("pt-BR")}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{fmt(deal.value, deal.currency)}</div>
            {deal.probability!=null && <div className="text-xs text-zinc-500">{deal.probability}% prob. · {deal.stage}</div>}
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Cliente</div>
            <div className="mt-1 font-semibold">{deal.company.name}</div>
            {[deal.company.industry, deal.company.location].filter(Boolean).length>0 && <div className="text-zinc-600">{[deal.company.industry, deal.company.location].filter(Boolean).join(" · ")}</div>}
            {deal.company.website && <div className="text-sky-600">{deal.company.website}</div>}
            {deal.primaryContact && <div className="mt-2 text-zinc-700">A/C {deal.primaryContact.name}{deal.primaryContact.role?` — ${deal.primaryContact.role}`:""}{deal.primaryContact.email?` · ${deal.primaryContact.email}`:""}</div>}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Condições</div>
            <div className="mt-1 space-y-1 text-zinc-700">
              <div>Valor: <span className="font-semibold">{fmt(deal.value, deal.currency)}</span> {deal.currency}</div>
              {deal.expectedCloseDate && <div>Validade: {new Date(deal.expectedCloseDate).toLocaleDateString("pt-BR")}</div>}
              {deal.source && <div>Origem: {deal.source}</div>}
            </div>
          </div>
        </div>
        {(deal.painSummary || deal.desiredOutcome || deal.currentSolution) && (
          <div className="mt-8 space-y-4 text-sm leading-relaxed">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Contexto</h2>
            {deal.painSummary && <p><span className="font-medium">Dor:</span> {deal.painSummary}</p>}
            {deal.currentSolution && <p><span className="font-medium">Solução atual:</span> {deal.currentSolution}</p>}
            {deal.desiredOutcome && <p><span className="font-medium">Resultado desejado:</span> {deal.desiredOutcome}</p>}
          </div>
        )}
        {deal.nextStep && (
          <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Próximo passo acordado</div>
            <div className="mt-1 font-medium">{deal.nextStep}</div>
            {deal.nextStepDate && <div className="text-xs text-zinc-500">{new Date(deal.nextStepDate).toLocaleDateString("pt-BR")}</div>}
          </div>
        )}
        <div className="mt-8 border-t pt-6 text-xs text-zinc-500">
          <p>Proposta gerada via Closer OS · {new Date().toLocaleString("pt-BR")} · Sujeita a validação e condições comerciais vigentes.</p>
        </div>
      </div>
    </div>
  );
}

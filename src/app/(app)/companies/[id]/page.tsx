import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/companies/timeline";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const company = await prisma.company.findFirst({
    where: { id, organizationId },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { updatedAt: "desc" }, include: { primaryContact: { select: { name: true } } } },
    },
  });
  if (!company) notFound();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {[company.industry, company.companySize, company.location].filter(Boolean).join(" · ") || "—"}
          </p>
          {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="text-sm text-sky-400 hover:underline">{company.website}</a>}
        </div>
        <Link href={`/companies/${company.id}/edit`}><Button variant="outline" size="sm">Editar</Button></Link>
      </div>

      {company.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">{company.description}</p>}
      {company.notes && <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">{company.notes}</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Contacts <Badge>{company.contacts.length}</Badge></h2>
            <Link href={`/contacts/new?companyId=${company.id}`} className="text-xs text-sky-400 hover:underline">+ Novo contato</Link>
          </div>
          <div className="mt-3 space-y-2">
            {company.contacts.length===0 && <p className="text-sm text-zinc-500">Nenhum contato.</p>}
            {company.contacts.map(c=>(
              <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:bg-zinc-900">
                <div><div className="text-sm font-medium text-zinc-100">{c.name}</div><div className="text-xs text-zinc-500">{[c.role, c.email].filter(Boolean).join(" · ")||"—"}</div></div>
                <Badge>{c.decisionRole}</Badge>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Deals <Badge>{company.deals.length}</Badge></h2>
            <Link href={`/deals/new?companyId=${company.id}`} className="text-xs text-sky-400 hover:underline">+ Novo deal</Link>
          </div>
          <div className="mt-3 space-y-2">
            {company.deals.length===0 && <p className="text-sm text-zinc-500">Nenhum deal.</p>}
            {company.deals.map(d=>(
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:bg-zinc-900">
                <div><div className="text-sm font-medium text-zinc-100">{d.name}</div><div className="text-xs text-zinc-500">{d.primaryContact?.name ?? "—"}</div></div>
                <div className="text-right"><Badge>{d.stage}</Badge>{d.value!=null && <div className="mt-1 text-xs text-zinc-400">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:d.currency}).format(Number(d.value))}</div>}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Timeline</h2>
        <p className="text-xs text-zinc-500">Histórico unificado: deals, calls, tasks, follow-ups, contatos.</p>
        <div className="mt-3"><Timeline companyId={company.id} /></div>
      </section>
    </div>
  );
}

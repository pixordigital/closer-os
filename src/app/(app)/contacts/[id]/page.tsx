import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId },
    include: { company: { select: { id:true, name:true } }, deals: { orderBy:{updatedAt:"desc"}, take:5, include:{ company:{select:{name:true}}}} },
  });
  if (!contact) notFound();
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ")||"—"}</p>
          <div className="mt-2 flex gap-2"><Badge>{contact.decisionRole}</Badge><Link href={`/companies/${contact.company.id}`} className="text-sm text-sky-400 hover:underline">{contact.company.name}</Link></div>
        </div>
        <Link href={`/contacts/${contact.id}/edit`}><Button variant="outline" size="sm">Editar</Button></Link>
      </div>
      {contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-sky-400 hover:underline">{contact.linkedinUrl}</a>}
      {contact.notes && <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">{contact.notes}</div>}
      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Deals ({contact.deals.length})</h2>
        <div className="mt-3 space-y-2">
          {contact.deals.length===0 && <p className="text-sm text-zinc-500">Nenhum deal com este contato.</p>}
          {contact.deals.map(d=>(
            <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 hover:bg-zinc-900">
              <span className="text-sm font-medium text-zinc-100">{d.name}</span><Badge>{d.stage}</Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

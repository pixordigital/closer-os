import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

function fmt(v: unknown, cur: string) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(Number(v));
}

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { token } as never, include: { deal: { include: { company: true, primaryContact: true } }, organization: { select: { name: true } } } as never });
  if (!proposal) notFound();
  const p = proposal as unknown as { id:string; token:string; title:string; html:string|null; items: Array<{name:string;qty:number;unitPrice:number;total?:number}>|null; total: unknown; currency:string; status:string; expiresAt: string|null; viewedCount:number; deal: { id:string; name:string; value:unknown; company:{name:string; website:string|null}; primaryContact:{name:string; email:string|null}|null }; organization:{name:string} };
  const expired = p.expiresAt ? new Date(p.expiresAt) < new Date() : false;
  const items = p.items ?? [];
  // ponytail: view counter best-effort, idempotent
  void prisma.proposal.update({ where:{ id: p.id }, data:{ viewedCount:{ increment:1 } as never, viewedAt: new Date(), status: p.status==="SENT" ? "VIEWED" : undefined } as never }).catch(()=>{});

  return (
    <div className="min-h-screen bg-zinc-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">{p.organization.name}</div>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{p.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">Deal: {p.deal.name} · Token {p.token.slice(0,8)}… · {p.status}{expired ? " · Expirada" : ""} · {p.viewedCount} visualizações</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-900">{fmt(p.total, p.currency)}</div>
          </div>
        </div>
        {p.html ? <div className="prose prose-sm mt-6 max-w-none text-zinc-700" dangerouslySetInnerHTML={{ __html: p.html }} /> : null}
        {items.length>0 && (
          <div className="mt-6 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qtd</th><th className="px-3 py-2 text-right">Unit.</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
              <tbody>{items.map((it,i)=>(<tr key={i} className="border-t"><td className="px-3 py-2">{it.name}</td><td className="px-3 py-2 text-right">{it.qty}</td><td className="px-3 py-2 text-right">{fmt(it.unitPrice, p.currency)}</td><td className="px-3 py-2 text-right font-medium">{fmt(it.total ?? Number(it.qty)*Number(it.unitPrice), p.currency)}</td></tr>))}</tbody>
              <tfoot><tr className="border-t bg-zinc-50 font-semibold"><td colSpan={3} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right">{fmt(p.total, p.currency)}</td></tr></tfoot>
            </table>
          </div>
        )}
        {p.deal.company && <div className="mt-6 text-sm text-zinc-600">Cliente: <span className="font-medium text-zinc-900">{p.deal.company.name}</span>{p.deal.company.website ? ` · ${p.deal.company.website}`:""}</div>}
        <div className="mt-8 flex flex-wrap gap-3">
          {expired ? <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700">Proposta expirada</span> : p.status==="ACCEPTED" ? <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">✓ Aceita</span> : p.status==="REJECTED" ? <span className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600">Recusada</span> : (
            <>
              <form action={`/api/p/${p.token}/accept`} method="POST"><button type="submit" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Aceitar proposta</button></form>
              <form action={`/api/p/${p.token}/reject`} method="POST"><button type="submit" className="rounded-full border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Recusar</button></form>
            </>
          )}
        </div>
        <p className="mt-6 text-xs text-zinc-400">Gerado via Closer OS · {new Date().toLocaleString("pt-BR")} · Ao aceitar, você concorda com os termos comerciais descritos.</p>
      </div>
    </div>
  );
}

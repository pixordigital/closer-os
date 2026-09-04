import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const status = (sp.status ?? "").trim().toUpperCase() || undefined;
  const q = (sp.q ?? "").trim();
  const dealId = (sp.dealId ?? "").trim() || undefined;
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string, string>).toString());
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const where = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" as const } }, { content: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.followUp.findMany({ where: where as never, orderBy: { createdAt: "desc" }, skip, take: limit, include: { deal: { select: { id: true, name: true } } } }),
    prisma.followUp.count({ where: where as never }),
  ]);
  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
          <p className="mt-1 text-sm text-zinc-400">Drafts gerados por IA — fluxo DRAFT → REVIEW → APPROVED → SENT</p>
        </div>
        <Link href="/calls"><Button size="sm" variant="outline">Gerar via Call</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos</option>
          {["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 space-y-2">
        {items.length === 0 && <p className="text-sm text-zinc-500">Nenhum follow-up.</p>}
        {items.map((f) => (
          <div key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{f.type}</Badge><Badge>{f.status}</Badge>
              <span className="text-xs text-zinc-500">{new Date(f.createdAt).toLocaleString("pt-BR")}</span>
              {f.deal && <Link href={`/deals/${f.deal.id}`} className="text-xs text-sky-400 hover:underline">{f.deal.name}</Link>}
              <span className="ml-auto flex gap-1">
                {f.status==="DRAFT" && <form action={`/api/follow-ups/${f.id}`} method="post"><input type="hidden" name="status" value="PENDING_REVIEW" /><button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700">→ Review</button></form>}
                {f.status==="PENDING_REVIEW" && <form action={`/api/follow-ups/${f.id}`} method="post"><input type="hidden" name="status" value="APPROVED" /><button className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500">Aprovar</button></form>}
                {f.status==="APPROVED" && <form action={`/api/follow-ups/${f.id}/send`} method="post"><button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500">Enviar</button></form>}
                {["DRAFT","PENDING_REVIEW","APPROVED"].includes(f.status) && <form action={`/api/follow-ups/${f.id}`} method="post"><input type="hidden" name="status" value="CANCELLED" /><button className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400">Cancelar</button></form>}
              </span>
            </div>
            {f.subject && <div className="mt-2 text-sm font-medium text-zinc-100">{f.subject}</div>}
            <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{f.content.slice(0, 600)}{f.content.length > 600 ? "…" : ""}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
    </div>
  );
}

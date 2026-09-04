import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const active = (sp.active ?? "").trim();
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string,string>).toString());
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });
  const where: Record<string, unknown> = {
    organizationId,
    ...(q ? { OR: [{ name:{ contains:q, mode:"insensitive" as const }},{ sku:{ contains:q, mode:"insensitive" as const }}]}:{}),
    ...(active==="true"?{active:true}:active==="false"?{active:false}:{}),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where: where as never, orderBy:{ updatedAt:"desc" }, skip, take: limit }),
    prisma.product.count({ where: where as never }),
  ]);
  const fmt=(v:unknown,cur="BRL")=> new Intl.NumberFormat("pt-BR",{style:"currency",currency:cur}).format(Number(v));
  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1><p className="mt-1 text-sm text-zinc-400">{total} produtos</p></div>
        <Link href="/products/new"><Button size="sm">+ Novo produto</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar nome/sku..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="active" defaultValue={active} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Buscar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400"><tr><th className="px-4 py-2 text-left">Produto</th><th className="px-4 py-2 text-left">SKU</th><th className="px-4 py-2 text-right">Preço</th><th className="px-4 py-2 text-center">Ativo</th><th className="px-4 py-2 text-right"></th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhum produto. Crie o primeiro.</td></tr>}
            {items.map((p)=>(
              <tr key={p.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3"><Link href={`/products/${p.id}/edit`} className="font-medium text-zinc-100 hover:underline">{p.name}</Link><div className="text-xs text-zinc-500 truncate max-w-[32ch]">{(p as {description:string|null}).description ?? ""}</div></td>
                <td className="px-4 py-3 text-zinc-400">{(p as {sku:string|null}).sku ?? "—"}</td>
                <td className="px-4 py-3 text-right">{fmt(p.price, p.currency)}</td>
                <td className="px-4 py-3 text-center">{p.active?"✓":"—"}</td>
                <td className="px-4 py-3 text-right"><Link href={`/products/${p.id}/edit`} className="text-xs text-sky-400 hover:underline">Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
    </div>
  );
}

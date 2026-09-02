import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string,string>).toString());
  const { page, limit, skip } = parsePagination(url, { page:1, limit:20 });
  const companyId = (sp.companyId ?? "").trim() || undefined;
  const where = {
    organizationId,
    ...(companyId ? { companyId } : {}),
    ...(q ? { OR: [{ name:{contains:q, mode:"insensitive" as const}},{ email:{contains:q, mode:"insensitive" as const}}]}:{}),
  };
  const [items, total, companies] = await Promise.all([
    prisma.contact.findMany({ where: where as never, orderBy:{createdAt:"desc"}, skip, take:limit, include:{ company:{select:{id:true,name:true}}}}),
    prisma.contact.count({ where: where as never }),
    prisma.company.findMany({ where:{organizationId}, select:{id:true,name:true}, orderBy:{name:"asc"}, take:100}),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <Link href="/contacts/new"><Button size="sm">+ Novo contato</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar nome ou email..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="companyId" defaultValue={companyId ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todas empresas</option>
          {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr><th className="px-4 py-2 text-left">Nome</th><th className="px-4 py-2 text-left">Empresa</th><th className="px-4 py-2 text-left">Papel</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Decision</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhum contato.</td></tr>}
            {items.map(c=>(
              <tr key={c.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3"><Link href={`/contacts/${c.id}`} className="font-medium text-zinc-100 hover:underline">{c.name}</Link></td>
                <td className="px-4 py-3 text-zinc-400">{c.company.name}</td>
                <td className="px-4 py-3 text-zinc-400">{c.role ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{c.decisionRole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
    </div>
  );
}

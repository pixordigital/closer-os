import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ImportCsv } from "@/components/companies/import-csv";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string,string>).toString());
  const { page, limit, skip } = parsePagination(url, { page:1, limit:20 });
  const where = { organizationId, ...(q ? { name: { contains: q, mode:"insensitive" as const }}:{} )};
  const [items, total] = await Promise.all([
    prisma.company.findMany({ where, orderBy:{updatedAt:"desc"}, skip, take:limit, include:{ _count:{select:{deals:true, contacts:true}}}}),
    prisma.company.count({ where }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <Link href="/companies/new"><Button size="sm">+ Nova empresa</Button></Link>
      </div>
      <form className="mt-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar empresa..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <Button type="submit" variant="outline" size="sm">Buscar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr><th className="px-4 py-2 text-left">Empresa</th><th className="px-4 py-2 text-left">Indústria</th><th className="px-4 py-2 text-left">Location</th><th className="px-4 py-2 text-right">Deals</th><th className="px-4 py-2 text-right">Contacts</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhuma empresa. Crie a primeira.</td></tr>}
            {items.map(c=>(
              <tr key={c.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3"><Link href={`/companies/${c.id}`} className="font-medium text-zinc-100 hover:underline">{c.name}</Link>{c.website && <div className="text-xs text-zinc-500">{c.website}</div>}</td>
                <td className="px-4 py-3 text-zinc-400">{c.industry ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{c.location ?? "—"}</td>
                <td className="px-4 py-3 text-right">{c._count.deals}</td>
                <td className="px-4 py-3 text-right">{c._count.contacts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
      <div className="mt-6"><ImportCsv /></div>
    </div>
  );
}

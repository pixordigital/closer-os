import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function QuotasPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const period = (sp.period ?? "").trim() || new Date().toISOString().slice(0,7);
  const quotas = await prisma.quota.findMany({ where:{ organizationId, period } as never, orderBy:{ createdAt:"desc" } });
  const members = await prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{id:true,name:true,email:true}} } });
  const mMap = new Map((members as unknown as {userId:string;user:{id:string;name:string;email:string}}[]).map(m=>[m.userId,m.user] as const));
  const rows = quotas.map(q=>{
    const v = q as unknown as { userId:string; period:string; target:unknown };
    const u = mMap.get(v.userId) ?? null;
    return { ...q, user: u, targetNum: Number(v.target as unknown as string) };
  });
  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Quotas</h1><p className="mt-1 text-sm text-zinc-400">Meta por closer · período {period}</p></div>
        <Link href="/quotas/new"><Button size="sm">+ Nova quota</Button></Link>
      </div>
      <form className="mt-4 flex gap-2">
        <input name="period" defaultValue={period} placeholder="YYYY-MM" pattern="\d{4}-\d{2}" className="h-9 w-32 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100" />
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400"><tr><th className="px-4 py-2 text-left">Closer</th><th className="px-4 py-2 text-left">Período</th><th className="px-4 py-2 text-right">Meta</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length===0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">Nenhuma quota neste período. Crie acima.</td></tr>}
            {rows.map(r=>(
              <tr key={r.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 text-zinc-100">{(r as {user:{name:string;email:string}|null}).user?.name ?? (r as unknown as {userId:string}).userId} <span className="text-xs text-zinc-500">{(r as {user:{email:string}|null}).user?.email ?? ""}</span></td>
                <td className="px-4 py-3 text-zinc-400">{(r as unknown as {period:string}).period}</td>
                <td className="px-4 py-3 text-right">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((r as {targetNum:number}).targetNum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-500">CRUD via <code className="text-zinc-300">/api/quotas</code> — POST {"{userId, period, target}"}. Reports cruza quota vs WON do período.</p>
    </div>
  );
}

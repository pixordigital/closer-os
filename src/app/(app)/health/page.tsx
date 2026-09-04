import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function HealthPage(){
  const { organizationId }=await requireTenant();
  const items=await prisma.accountHealth.findMany({ where:{ organizationId }, include:{ company:{ select:{ id:true, name:true } } }, orderBy:{ overallScore:"asc" }, take:50 });
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Account Health</h1><p className="text-sm text-zinc-400">Score 0-100 · tier HEALTHY/AT_RISK/CRITICAL/CHURNED</p></div>
        <Link href="/api/account-health" className="text-xs text-sky-400 hover:underline">API</Link>
      </div>
      <div className="grid gap-3">
        {items.length===0 && <p className="text-sm text-zinc-500">Nenhum health calculado. POST /api/account-health {"{companyId, overallScore}"}</p>}
        {items.map((h: unknown)=> {
          const r=h as { id:string; company:{name:string;id:string}; overallScore:number; tier:string; churnRisk:number|null; signals:unknown };
          return (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div><div className="text-sm font-medium text-zinc-100"><Link href={`/companies/${r.company.id}`} className="hover:underline">{r.company.name}</Link></div><div className="text-xs text-zinc-500">churn {r.churnRisk!=null?`${Math.round(Number(r.churnRisk)*100)}%`:"—"}</div></div>
              <div className="flex items-center gap-3"><span className="text-lg font-semibold">{r.overallScore}</span><Badge>{r.tier}</Badge></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

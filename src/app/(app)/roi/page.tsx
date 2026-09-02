import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { RoiCalculator } from "@/components/roi/calculator";
import { Badge } from "@/components/ui/badge";

function fmt(n:number){ return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n); }

export default async function RoiPage(){
  const { organizationId } = await requireTenant();
  const [models,deals]=await Promise.all([
    prisma.rOIModel.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take:50, include:{ deal:{ select:{ id:true, name:true } } } }),
    prisma.deal.findMany({ where:{ organizationId }, select:{ id:true, name:true }, orderBy:{ createdAt:"desc" }, take:50 }),
  ]);
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">ROI</h1><p className="text-sm text-zinc-400">3 cenários por deal — CONSERVATIVE / BASE / OPTIMISTIC</p></div>
      <RoiCalculator deals={deals} />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Modelos salvos ({models.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-2 text-left">Deal</th><th className="px-3 py-2 text-left">Cenário</th><th className="px-3 py-2 text-left">Mensal</th><th className="px-3 py-2 text-left">Anual</th><th className="px-3 py-2 text-left">ROI</th><th className="px-3 py-2 text-left">Payback</th><th className="px-3 py-2 text-left">Criado</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {models.length===0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Nenhum ROI ainda. Calcule e salve acima.</td></tr>}
              {models.map(m=>{
                const o=m.outputs as unknown as { monthlySavings:number,annualSavings:number,roi:number,paybackPeriod:number|null };
                return <tr key={m.id} className="hover:bg-zinc-800/40"><td className="px-3 py-2 text-zinc-200">{m.deal.name}</td><td className="px-3 py-2"><Badge>{m.scenario}</Badge></td><td className="px-3 py-2 text-emerald-400">{fmt(o.monthlySavings ?? 0)}</td><td className="px-3 py-2">{fmt(o.annualSavings ?? 0)}</td><td className="px-3 py-2">{(o.roi ?? 0).toFixed(1)}%</td><td className="px-3 py-2 text-zinc-400">{o.paybackPeriod ? `${o.paybackPeriod.toFixed(1)}m` : "—"}</td><td className="px-3 py-2 text-xs text-zinc-500">{new Date(m.createdAt).toLocaleDateString("pt-BR")}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

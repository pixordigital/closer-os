import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { computeHealth, healthColor, healthBarColor } from "@/lib/discovery";
import { Badge } from "@/components/ui/badge";

export default async function DiscoveryOverviewPage() {
  const { organizationId } = await requireTenant();
  const deals = await prisma.deal.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      company: { select: { name: true } },
      discoveryFields: { select: { key: true, status: true } },
    },
  });

  const rows = deals.map((d) => {
    const health = computeHealth(d.discoveryFields);
    const confirmed = d.discoveryFields.filter((f) => f.status === "CONFIRMED").length;
    const total = d.discoveryFields.length || 13;
    return { deal: d, health, confirmed, total };
  });
  rows.sort((a, b) => a.health - b.health);

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.health, 0) / rows.length) : 0;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discovery</h1>
          <p className="mt-1 text-sm text-zinc-400">Health por deal · 13 campos CLOSER · UNKNOWN 0 / PARTIAL 50 / CONFIRMED 100</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Média</div>
          <div className={`text-xl font-semibold ${healthColor(avg)}`}>{avg}%</div>
          <div className="text-xs text-zinc-500">{rows.length} deals</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left">Deal</th>
              <th className="px-4 py-2 text-left">Stage</th>
              <th className="px-4 py-2 text-left">Health</th>
              <th className="px-4 py-2 text-left">Preenchido</th>
              <th className="px-4 py-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhum deal. Crie um em Deals.</td>
              </tr>
            )}
            {rows.map(({ deal, health, confirmed, total }) => (
              <tr key={deal.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3">
                  <Link href={`/deals/${deal.id}`} className="font-medium text-zinc-100 hover:underline">{deal.name}</Link>
                  <div className="text-xs text-zinc-500">{deal.company.name}</div>
                </td>
                <td className="px-4 py-3"><Badge>{deal.stage}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${healthColor(health)}`}>{health}%</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                      <div className={`h-full ${healthBarColor(health)}`} style={{ width: `${health}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{confirmed}/{total}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/deals/${deal.id}`} className="text-xs text-sky-400 hover:underline">Abrir →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

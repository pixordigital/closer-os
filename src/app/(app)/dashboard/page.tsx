import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const s = await getSession();
  const orgId = s?.orgId;
  const [deals, companies, calls] = orgId
    ? await Promise.all([
        prisma.deal.count({ where: { organizationId: orgId } }),
        prisma.company.count({ where: { organizationId: orgId } }),
        prisma.call.count({ where: { organizationId: orgId } }),
      ])
    : [0, 0, 0];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-400">Bem-vindo ao Closer OS — seu segundo cérebro comercial.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Deals</p>
          <p className="mt-1 text-2xl font-semibold">{deals}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Companies</p>
          <p className="mt-1 text-2xl font-semibold">{companies}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Calls</p>
          <p className="mt-1 text-2xl font-semibold">{calls}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-zinc-800 p-6">
        <h2 className="font-medium">Próximos passos (Phase 1)</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-zinc-400 space-y-1">
          <li>Phase 2: Companies / Contacts / Deals / Pipeline</li>
          <li>Phase 3: Discovery Framework + Health Score</li>
          <li>Phase 4: Call Intelligence — transcript + missed opportunities</li>
          <li>Phase 5: AI wiring — pre-call + follow-up + coaching</li>
          <li>Phase 6: Roleplay Engine — cenários + simulação</li>
        </ul>
      </div>
    </div>
  );
}

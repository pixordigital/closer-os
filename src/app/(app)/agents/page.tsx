import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { AGENTS } from "@/lib/agents/autonomous";
import { AgentsClient } from "@/components/agents/agents-client";

export default async function AgentsPage(){
  const { organizationId } = await requireTenant();
  const pending = await prisma.aIRecommendation.findMany({ where:{ organizationId, dismissed:false, type:{ in:["hygiene_proposal","pipeline_move","followup_draft"] } }, orderBy:{ createdAt:"desc" }, take:50 });
  const recent = await prisma.auditLog.findMany({ where:{ organizationId, action:{ in:["pipeline.move_approved","call.analyzed"] } }, orderBy:{ createdAt:"desc" }, take:10 });
  const stats = {
    deals: await prisma.deal.count({ where:{ organizationId } }),
    calls: await prisma.call.count({ where:{ organizationId } }),
    pending: pending.length,
  };
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Agentes Autônomos</h1><p className="text-sm text-zinc-400">Operam sozinhos: preenchem, movem pipeline, criam follow-ups — pedem sua autorização quando precisa.</p></div>
      <AgentsClient initialPending={pending as never} agents={AGENTS as never} stats={stats} recent={recent as never} />
    </div>
  );
}

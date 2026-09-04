import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { validateStageGate } from "@/lib/stage-gates";
import { computeHealth } from "@/lib/discovery";

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  patch: z.object({
    stage: z.enum(["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"]).optional(),
    lostReason: z.string().max(5000).optional(),
    value: z.coerce.number().nonnegative().max(999999999999).optional().nullable(),
    probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
    nextStep: z.string().max(5000).optional(),
  }),
});

export async function POST(req:Request){
  const ctx = await requireTenant();
  const { organizationId, userId } = ctx;
  const { requireRole } = await import("@/lib/permissions");
  try{ await requireRole(ctx as never, organizationId, "ADMIN"); }catch(e){ const s=(e as {status?:number})?.status ?? 403; return NextResponse.json({error:(e as Error).message},{status:s}); }
  const body = await req.json().catch(()=>null);
  const p = schema.safeParse(body);
  if(!p.success) return NextResponse.json({ error: p.error.flatten() }, { status:400 });
  const { ids, patch } = p.data;

  // fetch scoped deals
  const deals = await prisma.deal.findMany({ where:{ id:{ in: ids }, organizationId } });
  if(deals.length===0) return NextResponse.json({ error:"Nenhum deal encontrado" }, { status:404 });
  const notFound = ids.filter(id=>!deals.some(d=>d.id===id));
  let updated=0, skipped=0;
  const errors: Array<{id:string, error:string}> = [];

  for(const d of deals){
    try{
      const merged = { ...d, ...patch } as Record<string,unknown>;
      if(patch.stage && patch.stage!==d.stage){
        let health: number|undefined;
        if(patch.stage==="PROPOSAL"){
          const fields = await prisma.discoveryField.findMany({ where:{ dealId: d.id }, select:{ key:true, status:true }});
          health = computeHealth(fields);
        }
        const gate = validateStageGate(patch.stage, merged as never, { discoveryHealth: health });
        if(!gate.ok) throw new Error(gate.message);
      }
      await prisma.deal.update({ where:{ id: d.id }, data: patch as never });
      updated++;
    }catch(e){ skipped++; errors.push({ id:d.id, error:String(e).slice(0,300)}); }
  }
  await auditLog({ organizationId, userId, action:"deal.bulk_updated", entityType:"Deal", metadata:{ ids, patch, updated, skipped } as never });
  return NextResponse.json({ updated, skipped, notFound, errors });
}

import { prisma } from "@/lib/db";
import { extractObjections } from "@/lib/objections";
import { getDiscoveryWithHealth } from "@/lib/discovery";

export type AgentId = "hygiene" | "pipeline" | "outreach";
export const AGENTS: Record<AgentId, { name:string, desc:string, trigger:string, risk:"low"|"medium"|"high" }> = {
  hygiene: { name:"Hygiene Agent", desc:"Preenche discovery e mapeia objeções a partir da call", trigger:"call.completed", risk:"low" },
  pipeline: { name:"Pipeline Sentinel", desc:"Move cards no pipeline quando sinais claros", trigger:"call.completed", risk:"medium" },
  outreach: { name:"Outreach Pilot", desc:"Cria rascunho de follow-up + tasks", trigger:"call.completed", risk:"low" },
};

const STAGE_ORDER=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"] as const;

export async function runHygieneAgent(organizationId:string, payload:{callId:string}){
  const call = await prisma.call.findFirst({ where:{ id:payload.callId, organizationId }, include:{ transcript:true, deal:true } });
  if(!call?.transcript?.content) return { skipped:"no transcript" };
  const dealId = call.deal?.id ?? null;
  const text = call.transcript.content;
  const objs = extractObjections(text);
  const proposals: unknown[] = [];
  if(dealId){
    const { health } = await getDiscoveryWithHealth(dealId);
    // propose discovery fills via AI analysis would be here — for now use objections as signal
    proposals.push({ type:"discovery", health, dealId });
  }
  // create pending approvals for each objection if not exists
  for(const o of objs){
    const exists = await prisma.aIRecommendation.findFirst({ where:{ organizationId, type:"hygiene_proposal", title: o.content.slice(0,120) } });
    if(!exists){
      await prisma.aIRecommendation.create({ data:{ organizationId, type:"hygiene_proposal", title:o.content.slice(0,120), reason:`Objeção ${o.category} detectada em call ${call.id}`, payload:{ callId:call.id, dealId, category:o.category, content:o.content, requiresApproval:false } as never } as never });
    }
  }
  // create objections directly low-risk autonomous
  for(const o of objs){
    const dup = await prisma.objection.findFirst({ where:{ organizationId, callId:call.id, content:o.content } });
    if(!dup) await prisma.objection.create({ data:{ organizationId, callId:call.id, dealId: dealId ?? undefined, category:o.category as never, content:o.content } });
  }
  return { agent:"hygiene", objections: objs.length, proposals };
}

export async function runPipelineAgent(organizationId:string, payload:{callId?:string, dealId?:string}){
  const dealId = payload.dealId ?? (payload.callId ? (await prisma.call.findUnique({ where:{id:payload.callId}, select:{dealId:true}}))?.dealId : null);
  if(!dealId) return { skipped:"no deal" };
  const deal = await prisma.deal.findFirst({ where:{ id:dealId, organizationId } });
  if(!deal) return { skipped:"deal not found" };
  const { health } = await getDiscoveryWithHealth(dealId);
  const idx = STAGE_ORDER.indexOf(deal.stage as never);
  let proposed: string|null = null;
  let requiresApproval=true;
  if(health>=75 && idx<2) proposed="DISCOVERY";
  else if(health>=60 && deal.stage==="DISCOVERY") proposed="SOLUTION";
  else if(health>=80 && deal.stage==="SOLUTION") proposed="PROPOSAL";
  if(!proposed) return { agent:"pipeline", health, current:deal.stage, noMove:true };
  // high risk moves to WON/LOST always require approval
  if(["WON","LOST"].includes(proposed)) requiresApproval=true;
  // create recommendation for approval
  await prisma.aIRecommendation.create({ data:{
    organizationId, type:"pipeline_move", title:`Mover ${deal.name} ${deal.stage} → ${proposed} (health ${health}%)`,
    reason:`Health ${health}% + call signals`, payload:{ dealId, from:deal.stage, to:proposed, health, requiresApproval } as never
  } as never });
  // autonomous move only if low risk and health high and not WON/LOST — but still ask approval per rule: if requiresApproval false then move
  // For safety, pipeline always requires approval in MVP
  return { agent:"pipeline", proposed, requiresApproval, health };
}

export async function runOutreachAgent(organizationId:string, payload:{callId:string}){
  const call = await prisma.call.findFirst({ where:{ id:payload.callId, organizationId }, include:{ transcript:true, deal:true } });
  if(!call) return { skipped:"no call" };
  const dealId = call.deal?.id ?? null;
  // low-risk: create draft follow-up + task, both require approval to send
  const existing = await prisma.aIRecommendation.findFirst({ where:{ organizationId, type:"followup_draft", payload:{ path:["callId"], equals: call.id } as never } });
  if(!existing){
    await prisma.aIRecommendation.create({ data:{
      organizationId, type:"followup_draft", title:`Follow-up rascunho para ${call.title}`,
      reason:`Call ${call.id} completada`, payload:{ callId:call.id, dealId, status:"DRAFT", requiresApproval:true } as never
    } as never });
  }
  if(dealId){
    const taskExists = await prisma.task.findFirst({ where:{ organizationId, dealId, title:{ contains:"Follow-up" } } });
    if(!taskExists){
      await prisma.task.create({ data:{ organizationId, dealId, title:`Follow-up: ${call.title}`, description:"Criado automaticamente pelo Outreach Pilot — revise e marque como feito", status:"TODO" as never } as never });
    }
  }
  return { agent:"outreach", draft:true };
}

export async function runAllAgents(organizationId:string, trigger:string, payload:Record<string,unknown>){
  if(trigger==="call.completed" && payload.callId){
    const a = await runHygieneAgent(organizationId, { callId: payload.callId as string });
    const b = await runPipelineAgent(organizationId, { callId: payload.callId as string });
    const c = await runOutreachAgent(organizationId, { callId: payload.callId as string });
    return [a,b,c];
  }
  if(trigger==="deal.updated" && payload.dealId){
    return [await runPipelineAgent(organizationId, { dealId: payload.dealId as string })];
  }
  return [];
}

import { prisma } from "@/lib/db";
import { extractObjections } from "@/lib/objections";
import { getDiscoveryWithHealth } from "@/lib/discovery";
import { getAIProvider } from "@/lib/ai/init";
import { modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";

export type AgentId = "hygiene" | "pipeline" | "outreach" | "stale" | "forecast";
export const AGENTS: Record<AgentId, { name:string, desc:string, trigger:string, risk:"low"|"medium"|"high" }> = {
  hygiene: { name:"Hygiene Agent", desc:"Preenche discovery e mapeia objeções a partir da call", trigger:"call.completed", risk:"low" },
  pipeline: { name:"Pipeline Sentinel", desc:"Move cards no pipeline quando sinais claros", trigger:"call.completed", risk:"medium" },
  outreach: { name:"Outreach Pilot", desc:"Cria rascunho de follow-up + tasks", trigger:"call.completed", risk:"low" },
  stale: { name:"Stale Watchdog", desc:"Detecta deals parados >7d e cria nudges", trigger:"daily_digest", risk:"low" },
  forecast: { name:"Forecast Guard", desc:"Sinaliza valor/probabilidade inconsistentes", trigger:"deal.updated", risk:"low" },
};

const STAGE_ORDER=["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"] as const;

export async function runHygieneAgent(organizationId:string, payload:{callId:string}){
  const call = await prisma.call.findFirst({ where:{ id:payload.callId, organizationId }, include:{ transcript:true, deal:true } });
  if(!call?.transcript?.content) return { skipped:"no transcript" };
  const dealId = call.deal?.id ?? null;
  const text = call.transcript.content;
  let objs = extractObjections(text);
  // ponytail: try AI extraction when key present, else regex wins — no extra dep
  try{
    const prov = getAIProvider();
    if(prov.name !== "mock"){
      const { model } = modelForTask("classification");
      const t0=Date.now();
      const res = await prov.generateStructured({
        model, system:"Extraia objeções. Categorias: PRICE,TIMING,AUTHORITY,TRUST,COMPETITION,STATUS_QUO,NEED,PRIORITY,IMPLEMENTATION,RISK,INTERNAL_APPROVAL. Retorne {objections:[{category,content}]}. No Evidence=Unknown. pt-BR.",
        prompt:`Transcript:\n"""${text.slice(0,6000)}"""`,
        schema: (await import("zod")).z.object({ objections: (await import("zod")).z.array((await import("zod")).z.object({ category:(await import("zod")).z.string(), content:(await import("zod")).z.string() })) }),
      }) as { objections: typeof objs };
      if(res?.objections?.length) objs = res.objections.slice(0,10).map(o=>({ category:o.category as never, content:o.content.slice(0,500), sentence:o.content })) as typeof objs;
      await logAIUsage({ organizationId, provider: prov.name, model, operation:"generateStructured", agent:"HygieneAgent", latencyMs: Date.now()-t0, estimatedCost: estimateCost(model,null,null)}).catch(()=>{});
    }
  }catch{}
  const proposals: unknown[] = [];
  if(dealId){
    const { health } = await getDiscoveryWithHealth(dealId);
    proposals.push({ type:"discovery", health, dealId });
  }
  for(const o of objs){
    const exists = await prisma.aIRecommendation.findFirst({ where:{ organizationId, type:"hygiene_proposal", title: o.content.slice(0,120) } });
    if(!exists){
      await prisma.aIRecommendation.create({ data:{ organizationId, type:"hygiene_proposal", title:o.content.slice(0,120), reason:`Objeção ${o.category} detectada em call ${call.id}`, payload:{ callId:call.id, dealId, category:o.category, content:o.content, requiresApproval:false } as never } as never });
    }
  }
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
  if(["WON","LOST"].includes(proposed)) requiresApproval=true;
  await prisma.aIRecommendation.create({ data:{
    organizationId, type:"pipeline_move", title:`Mover ${deal.name} ${deal.stage} → ${proposed} (health ${health}%)`,
    reason:`Health ${health}% + call signals`, payload:{ dealId, from:deal.stage, to:proposed, health, requiresApproval } as never
  } as never });
  return { agent:"pipeline", proposed, requiresApproval, health };
}

export async function runOutreachAgent(organizationId:string, payload:{callId:string}){
  const call = await prisma.call.findFirst({ where:{ id:payload.callId, organizationId }, include:{ transcript:true, deal:true } });
  if(!call) return { skipped:"no call" };
  const dealId = call.deal?.id ?? null;
  const existing = await prisma.aIRecommendation.findFirst({ where:{ organizationId, type:"followup_draft", payload:{ path:["callId"], equals: call.id } as never } });
  if(!existing){
    await prisma.aIRecommendation.create({ data:{
      organizationId, type:"followup_draft", title:`Follow-up rascunho para ${call.title}`,
      reason:`Call ${call.id} completada`, payload:{ callId:call.id, dealId, status:"DRAFT", requiresApproval:true } as never
    } as never });
  }
  // ponytail: generate real draft via AI when possible — cheap model, DRAFT only
  try{
    if(dealId){
      const prov = getAIProvider();
      const { model } = modelForTask("summarization");
      const t0=Date.now();
      const deal = await prisma.deal.findFirst({ where:{ id: dealId, organizationId }, include:{ company:true, primaryContact:true }});
      const ins = await prisma.aIInsight.findMany({ where:{ callId: call.id, organizationId }, take:5 });
      const prompt = `Gere 1 rascunho EMAIL follow-up pt-BR para deal ${deal?.name ?? dealId}. Transcript: """${(call.transcript?.content ?? "").slice(0,4000)}""" Insights: ${JSON.stringify(ins).slice(0,2000)}. Retorne {subject, content}. Não invente compromissos.`;
      const r = await prov.generateStructured({
        model, system:"Gere follow-up B2B pt-BR. Nunca invente. Retorne JSON {subject,content}.",
        prompt, schema: (await import("zod")).z.object({ subject:(await import("zod")).z.string(), content:(await import("zod")).z.string() }),
      }) as { subject:string, content:string };
      if(r?.content){
        await prisma.followUp.create({ data:{ organizationId, dealId, callId: call.id, type:"EMAIL" as never, subject: r.subject ?? "Follow-up", content: r.content, status:"DRAFT" as never } as never });
        await logAIUsage({ organizationId, provider: prov.name, model, operation:"generateStructured", agent:"OutreachPilot", latencyMs: Date.now()-t0, estimatedCost: estimateCost(model,null,null)}).catch(()=>{});
      }
    }
  }catch{}
  if(dealId){
    const taskExists = await prisma.task.findFirst({ where:{ organizationId, dealId, title:{ contains:"Follow-up" } } });
    if(!taskExists){
      await prisma.task.create({ data:{ organizationId, dealId, title:`Follow-up: ${call.title}`, description:"Criado automaticamente pelo Outreach Pilot — revise e marque como feito", status:"TODO" as never } as never });
    }
  }
  return { agent:"outreach", draft:true };
}

export async function runStaleAgent(organizationId:string){
  const staleCut=new Date(Date.now()-7*864e5);
  const deals=await prisma.deal.findMany({ where:{ organizationId, stage:{notIn:["WON","LOST"] as never}, updatedAt:{lt:staleCut}}, take:20, select:{id:true,name:true,stage:true,updatedAt:true}});
  let created=0;
  for(const d of deals){
    const exists=await prisma.task.findFirst({ where:{ organizationId, dealId:d.id, title:{ contains:"Stale" } }});
    if(exists) continue;
    await prisma.task.create({ data:{ organizationId, dealId:d.id, title:`Stale: ${d.name} parado há 7d+ [${d.stage}]`, description:`Deal sem atualização desde ${d.updatedAt.toLocaleDateString("pt-BR")} — verificar next step.`, status:"TODO" as never } as never });
    await prisma.aIRecommendation.create({ data:{ organizationId, type:"stale_nudge", title:`Deal parado: ${d.name}`, reason:`Sem update há 7d+ em ${d.stage}`, payload:{ dealId:d.id, stage:d.stage } as never } as never });
    created++;
  }
  return { agent:"stale", checked: deals.length, created };
}

export async function runForecastAgent(organizationId:string, payload:{dealId:string}){
  const deal=await prisma.deal.findFirst({ where:{ id:payload.dealId, organizationId }});
  if(!deal) return { skipped:"deal not found" };
  const issues:string[]=[];
  const v=deal.value ? Number(deal.value) : null;
  const p=deal.probability;
  if(v!=null && v>0 && p==null) issues.push("Valor sem probabilidade — forecast inconsistente");
  if(p!=null && p>=70 && !deal.expectedCloseDate) issues.push("Probabilidade alta sem data de fechamento");
  if(p!=null && p<20 && deal.stage==="NEGOTIATION") issues.push("NEGOTIATION com prob <20% — revisar");
  if(v!=null && v>100000 && deal.stage==="LEAD") issues.push("Ticket alto ainda em LEAD — qualificar");
  if(issues.length===0) return { agent:"forecast", ok:true };
  for(const iss of issues){
    const exists=await prisma.aIRecommendation.findFirst({ where:{ organizationId, type:"forecast_flag", payload:{ path:["dealId"], equals: deal.id } as never }});
    if(!exists) await prisma.aIRecommendation.create({ data:{ organizationId, type:"forecast_flag", title:`Forecast: ${deal.name}`, reason: iss, payload:{ dealId:deal.id, stage:deal.stage, value:v, probability:p } as never } as never });
  }
  return { agent:"forecast", issues };
}

export async function runAllAgents(organizationId:string, trigger:string, payload:Record<string,unknown>){
  if(trigger==="call.completed" && payload.callId){
    const a = await runHygieneAgent(organizationId, { callId: payload.callId as string });
    const b = await runPipelineAgent(organizationId, { callId: payload.callId as string });
    const c = await runOutreachAgent(organizationId, { callId: payload.callId as string });
    return [a,b,c];
  }
  if(trigger==="deal.updated" && payload.dealId){
    const b = await runPipelineAgent(organizationId, { dealId: payload.dealId as string });
    const f = await runForecastAgent(organizationId, { dealId: payload.dealId as string });
    return [b,f];
  }
  if(trigger==="deal.stale" || trigger==="daily_digest"){
    return [await runStaleAgent(organizationId), await runForecastAgent(organizationId, payload as never).catch(()=>({agent:"forecast",skipped:true}))];
  }
  if(trigger==="task.overdue"){
    // reuse stale logic light
    return [await runStaleAgent(organizationId)];
  }
  return [];
}

import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { performanceCoachSchema } from "@/lib/ai/schemas";
import { performanceCoachPrompt } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/init";
import { generateStructuredWithRetry, modelForTask } from "@/lib/ai/provider";
import { logAIUsage, estimateCost } from "@/lib/ai/usage";
import { z } from "zod";

const schema = z.object({
  transcript: z.string().min(10).max(20000),
  meetingUrl: z.string().max(500).optional().nullable(),
  provider: z.enum(["meet","zoom","custom"]).optional().default("meet"),
  callId: z.string().cuid().optional().nullable(),
  dealId: z.string().cuid().optional().nullable(),
  saveAsCall: z.boolean().optional().default(false),
  title: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { transcript, meetingUrl, provider, callId, dealId, saveAsCall, title } = parsed.data;

  let call: { id:string, dealId:string|null }|null = null;
  if(callId){
    call = await prisma.call.findFirst({ where:{ id:callId, organizationId }, select:{ id:true, dealId:true } });
    if(!call) return NextResponse.json({ error:"Call not found" }, { status:404 });
  }

  const deal = dealId || call?.dealId ? await prisma.deal.findFirst({ where:{ id: (dealId ?? call!.dealId)!, organizationId }, include:{ company:true } }) : null;
  const insights = callId ? await prisma.aIInsight.findMany({ where:{ callId:callId!, organizationId }, take:5 }) : [];
  const skills = await prisma.sellerSkill.findMany({ where:{ userId } });
  const scenarios = await prisma.roleplayScenario.findMany({ where:{ OR:[{organizationId},{organizationId:null}] }, select:{ id:true,title:true,difficulty:true,trainingObjective:true }, take:15 });

  const prompt = performanceCoachPrompt({
    transcript: transcript + (meetingUrl ? `\n\n[Video call: ${provider} ${meetingUrl}]` : ""),
    deal, company: (deal as unknown as { company?:unknown })?.company ?? null, insights, skills
  });

  const aiProvider = getAIProvider();
  const { model } = modelForTask("coaching");
  const t0=Date.now();
  try{
    const result = await generateStructuredWithRetry(aiProvider, {
      model,
      system:"Você é Performance Coach B2B direto e baseado em evidência. Analise transcript de VIDEO CALL (Meet/Zoom) e retorne JSON no schema.",
      prompt: prompt + `\n\nCenários disponíveis: ${JSON.stringify(scenarios).slice(0,2000)}`,
      schema: performanceCoachSchema,
      temperature:0.3,
    });

    const withIds = {
      ...result,
      recommendedRoleplays: result.recommendedRoleplays.map(r=>{
        if(r.scenarioId) return r;
        const m=scenarios.find(s=>s.trainingObjective?.toLowerCase().includes(r.trainingObjective.toLowerCase().slice(0,10))||s.title.toLowerCase().includes(r.title.toLowerCase().slice(0,10)));
        return {...r, scenarioId: m?.id ?? null};
      })
    };

    let savedCallId = callId ?? null;
    if(saveAsCall){
      const c = await prisma.call.create({
        data:{
          organizationId,
          dealId: deal?.id ?? dealId ?? null,
          title: title ?? `Video Call ${provider} ${new Date().toLocaleDateString("pt-BR")}`,
          status:"COMPLETED" as never,
          analysisStatus:"COMPLETED" as never,
        }
      });
      await prisma.transcript.create({ data:{ callId:c.id, content: transcript, language:"pt-BR", speakerSegments: { provider, meetingUrl } as never } });
      savedCallId=c.id;
      await prisma.aIInsight.create({
        data:{
          organizationId, dealId: deal?.id ?? null, callId:c.id, type:"coaching",
          title:`Performance Video: ${withIds.summary.slice(0,120)}`,
          evidence:`Score ${withIds.overallScore} — video ${provider}`,
          confidence:withIds.overallScore/100,
          whyItMatters:withIds.summary,
          recommendedAction:withIds.nextSteps.join(" | ") || withIds.improvements[0]?.suggestion,
          metadata: withIds as never,
        } as never
      });
    } else if(callId){
      await prisma.aIInsight.create({
        data:{
          organizationId, dealId: deal?.id ?? null, callId, type:"coaching",
          title:`Performance Video: ${withIds.summary.slice(0,120)}`,
          evidence:`Score ${withIds.overallScore} — video ${provider}`,
          confidence:withIds.overallScore/100,
          whyItMatters:withIds.summary,
          recommendedAction:withIds.nextSteps.join(" | "),
          metadata: withIds as never,
        } as never
      });
    }

    await logAIUsage({ organizationId, userId, provider: aiProvider.name, model, operation:"generateStructured", agent:"PerformanceCoach-Video", latencyMs:Date.now()-t0, estimatedCost: estimateCost(model,null,null) });

    return NextResponse.json({ ...withIds, savedCallId, provider, meetingUrl });
  }catch(e){
    await logAIUsage({ organizationId, userId, provider: aiProvider.name, model, operation:"generateStructured", agent:"PerformanceCoach-Video", latencyMs:Date.now()-t0, status:"error" });
    return NextResponse.json({ error:(e as Error).message }, { status:500 });
  }
}

import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { encrypt, decrypt, mask } from "@/lib/crypto";

const saveSchema = z.object({
  provider: z.enum(["openai","anthropic","gemini","openrouter"]).optional(),
  model: z.string().max(80).optional().nullable(),
  openaiKey: z.string().max(200).optional().nullable(),
  anthropicKey: z.string().max(200).optional().nullable(),
  geminiKey: z.string().max(200).optional().nullable(),
  openrouterKey: z.string().max(200).optional().nullable(),
  litellmKey: z.string().max(200).optional().nullable(),
  useLitellm: z.boolean().optional(),
});

function dec(v?: string | null){ if(!v) return null; try{ return decrypt(v); }catch{ return v; } }

export async function GET(){
  const { organizationId } = await requireTenant();
  const cfg = await prisma.aIConfig.findUnique({ where:{ organizationId } });
  if(!cfg) return NextResponse.json({ provider:"openai", model:null, useLitellm:true, litellmUrl:"http://litellm:4000", hasKeys:{ openai:false, anthropic:false, gemini:false, openrouter:false } });
  return NextResponse.json({
    provider: cfg.provider,
    model: cfg.model,
    useLitellm: cfg.useLitellm,
    litellmUrl: cfg.litellmUrl,
    hasKeys:{
      openai: !!cfg.openaiKey,
      anthropic: !!cfg.anthropicKey,
      gemini: !!cfg.geminiKey,
      openrouter: !!cfg.openrouterKey,
    },
    masked:{
      openai: mask(cfg.openaiKey),
      anthropic: mask(cfg.anthropicKey),
      gemini: mask(cfg.geminiKey),
      openrouter: mask(cfg.openrouterKey),
      litellm: mask(cfg.litellmKey),
    }
  });
}

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = saveSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const d = parsed.data;
  const data: Record<string,unknown> = {};
  if(d.provider) data.provider=d.provider;
  if(d.model!==undefined) data.model=d.model;
  if(d.useLitellm!==undefined) data.useLitellm=d.useLitellm;
  if(d.openaiKey!==undefined) data.openaiKey = d.openaiKey ? encrypt(d.openaiKey) : null;
  if(d.anthropicKey!==undefined) data.anthropicKey = d.anthropicKey ? encrypt(d.anthropicKey) : null;
  if(d.geminiKey!==undefined) data.geminiKey = d.geminiKey ? encrypt(d.geminiKey) : null;
  if(d.openrouterKey!==undefined) data.openrouterKey = d.openrouterKey ? encrypt(d.openrouterKey) : null;
  if(d.litellmKey!==undefined) data.litellmKey = d.litellmKey ? encrypt(d.litellmKey) : null;
  const cfg = await prisma.aIConfig.upsert({ where:{ organizationId }, create:{ organizationId, ...data } as never, update: data as never });
  return NextResponse.json({ ok:true, id: cfg.id });
}

export async function DELETE(){
  const { organizationId } = await requireTenant();
  await prisma.aIConfig.delete({ where:{ organizationId } }).catch(()=>{});
  return NextResponse.json({ ok:true });
}

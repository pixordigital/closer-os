import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(){
  const { organizationId } = await requireTenant();
  const cfg = await prisma.aIConfig.findUnique({ where:{ organizationId } });
  const key = cfg?.openaiKey ? (()=>{ try{ return decrypt(cfg.openaiKey!);}catch{return null}})() : process.env.OPENAI_API_KEY;
  const url = cfg?.useLitellm ? (cfg.litellmUrl ?? process.env.LITELLM_URL ?? "http://litellm:4000") : "https://api.openai.com";
  // simple health check via litellm or openai
  try{
    if(cfg?.useLitellm){
      const r = await fetch(`${url}/health/liveliness`, { headers: cfg.litellmKey ? { Authorization:`Bearer ${(()=>{try{return decrypt(cfg.litellmKey!) }catch{return ""}})()}`} : {} } as never);
      return NextResponse.json({ ok: r.ok, via:"litellm", status: r.status });
    } else {
      if(!key) return NextResponse.json({ ok:false, error:"Sem OPENAI_API_KEY" }, { status:400 });
      const r = await fetch("https://api.openai.com/v1/models",{ headers:{ Authorization:`Bearer ${key}` } });
      return NextResponse.json({ ok: r.ok, via:"openai", status: r.status });
    }
  }catch(e){
    return NextResponse.json({ ok:false, error:String(e) }, { status:500 });
  }
}

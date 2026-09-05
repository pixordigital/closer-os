import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { evolutionCreateInstance, evolutionStatus, evolutionDelete, evolutionRestart, evolutionSetWebhook, evolutionUpdateSettings } from "@/lib/whatsapp/evolution";
import { prisma } from "@/lib/db";

function webhookUrlFor(req: Request){
  const env = process.env.EVOLUTION_WEBHOOK_URL?.trim();
  if(env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  if(!host) return null;
  return `${proto}://${host}/api/whatsapp/webhook`;
}

export async function GET(req: Request){
  const { organizationId } = await requireTenant();
  const conns = await prisma.integrationConnection.findMany({ where:{ organizationId, provider:"evolution" } });
  const statuses = await Promise.all(conns.map(async c=>{
    try{ const s=await evolutionStatus(c.id); return { id:c.id, status: (s as {state?:string}).state ?? (s as {instance?:{state?:string}}).instance?.state ?? "unknown", raw:s }; }catch(e){ return { id:c.id, status:"error", error:String(e) } }
  }));
  // warmup info for UI
  const { cfgFor } = await import("@/lib/whatsapp/antiban");
  const withWarmup = statuses.map(s=>{
    const conn = conns.find(c=>c.id===s.id);
    const cfg = cfgFor(conn?.createdAt as Date|undefined);
    const ageDays = conn ? (Date.now()-new Date(conn.createdAt as unknown as string).getTime())/86400000 : 0;
    return { ...s, ageDays: Math.floor(ageDays*10)/10, warmupPct: Math.min(100, Math.round(ageDays/cfg.warmupDays*100)), maxPerMinute: cfg.maxPerMinute, maxPerHour: cfg.maxPerHour, maxPerDay: cfg.maxPerDay };
  });
  return NextResponse.json({ instances: conns.map(c=>({ id:c.id, config:c.config, status: (c as {status:string}).status, createdAt: (c as {createdAt:Date}).createdAt })), statuses: withWarmup });
}
export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null) as { instance?:string }|null;
  const instance = (body?.instance ?? `closer-${organizationId.slice(-6)}`).replace(/[^a-z0-9-]/gi,"-").toLowerCase();
  const data = await evolutionCreateInstance(instance);
  await prisma.integrationConnection.create({ data:{ id: instance, organizationId, provider:"evolution", kind:"whatsapp", status:"connecting", config: data as never } as never }).catch(async()=>{
    await prisma.integrationConnection.update({ where:{ id: instance }, data:{ status:"connecting", config: data as never } });
  });
  // auto-configure webhook (fire-and-forget, non-blocking)
  const url = webhookUrlFor(req);
  if(url){
    evolutionSetWebhook(instance, url, ["MESSAGES_UPSERT","MESSAGES_UPDATE","CONNECTION_UPDATE","SEND_MESSAGE"]).catch(()=>{});
  }
  return NextResponse.json({ instance, data, webhookUrl: url ?? null });
}
export async function PATCH(req:Request){
  const { organizationId }=await requireTenant();
  const body=await req.json().catch(()=>null) as { instance:string; webhookUrl?:string; webhookEvents?:string[]; settings?:Record<string,unknown>; action?: "restart"|"logout"|"setWebhook" }|null;
  if(!body?.instance) return NextResponse.json({ error:"instance required" }, { status:400 });
  const conn=await prisma.integrationConnection.findFirst({ where:{ id: body.instance, organizationId } });
  if(!conn) return NextResponse.json({ error:"Instância não encontrada" }, { status:404 });
  let result:unknown=null;
  if(body.action==="restart") result=await evolutionRestart(body.instance);
  else if(body.action==="logout") { const { evolutionLogout } = await import("@/lib/whatsapp/evolution"); result=await evolutionLogout(body.instance); }
  else if(body.action==="setWebhook" || body.webhookUrl){
    const url = body.webhookUrl ?? webhookUrlFor(req);
    if(!url) return NextResponse.json({ error:"webhookUrl required" }, { status:400 });
    result=await evolutionSetWebhook(body.instance, url, body.webhookEvents ?? ["MESSAGES_UPSERT","MESSAGES_UPDATE","CONNECTION_UPDATE","SEND_MESSAGE"]);
    await prisma.integrationConnection.update({ where:{ id: body.instance }, data:{ config: { ...(conn.config as Record<string,unknown>), webhookUrl:url } as never, status:"connected" } });
    return NextResponse.json({ ok:true, instance: body.instance, webhookUrl: url, result });
  }
  else {
    if(body.webhookUrl) result=await evolutionSetWebhook(body.instance, body.webhookUrl, body.webhookEvents);
    if(body.settings) result=await evolutionUpdateSettings(body.instance, body.settings);
    await prisma.integrationConnection.update({ where:{ id: body.instance }, data:{ config: { ...(conn.config as Record<string,unknown>), ...body } as never, status:"connected" } });
  }
  return NextResponse.json({ ok:true, instance: body.instance, result });
}
export async function DELETE(req:Request){
  const { organizationId }=await requireTenant();
  const url=new URL(req.url);
  const instance=url.searchParams.get("instance") ?? (await req.json().catch(()=>null) as {instance?:string}|null)?.instance;
  if(!instance) return NextResponse.json({ error:"instance required" }, { status:400 });
  const conn=await prisma.integrationConnection.findFirst({ where:{ id: instance, organizationId } });
  if(!conn) return NextResponse.json({ error:"Instância não encontrada" }, { status:404 });
  try{ await evolutionDelete(instance); }catch{}
  await prisma.integrationConnection.delete({ where:{ id: instance } });
  return NextResponse.json({ ok:true, deleted: instance });
}

import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { evolutionCreateInstance, evolutionStatus, evolutionDelete, evolutionRestart, evolutionSetWebhook, evolutionUpdateSettings } from "@/lib/whatsapp/evolution";
import { prisma } from "@/lib/db";

export async function GET(){
  const { organizationId } = await requireTenant();
  const conns = await prisma.integrationConnection.findMany({ where:{ organizationId, provider:"evolution" } });
  const statuses = await Promise.all(conns.map(async c=>{
    try{ const s=await evolutionStatus(c.id); return { id:c.id, status: (s as {state?:string}).state ?? "unknown", raw:s }; }catch(e){ return { id:c.id, status:"error", error:String(e) } }
  }));
  return NextResponse.json({ instances: conns.map(c=>({ id:c.id, config:c.config })), statuses });
}
export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null) as { instance?:string }|null;
  const instance = (body?.instance ?? `closer-${organizationId.slice(-6)}`).replace(/[^a-z0-9-]/gi,"-").toLowerCase();
  const data = await evolutionCreateInstance(instance);
  await prisma.integrationConnection.create({ data:{ id: instance, organizationId, provider:"evolution", kind:"whatsapp", status:"connecting", config: data as never } as never }).catch(async()=>{
    await prisma.integrationConnection.update({ where:{ id: instance }, data:{ status:"connecting", config: data as never } });
  });
  return NextResponse.json({ instance, data });
}
export async function PATCH(req:Request){
  const { organizationId }=await requireTenant();
  const body=await req.json().catch(()=>null) as { instance:string; webhookUrl?:string; webhookEvents?:string[]; settings?:Record<string,unknown>; action?: "restart"|"logout" }|null;
  if(!body?.instance) return NextResponse.json({ error:"instance required" }, { status:400 });
  const conn=await prisma.integrationConnection.findFirst({ where:{ id: body.instance, organizationId } });
  if(!conn) return NextResponse.json({ error:"Instância não encontrada" }, { status:404 });
  let result:unknown=null;
  if(body.action==="restart") result=await evolutionRestart(body.instance);
  else if(body.action==="logout") { const { evolutionLogout } = await import("@/lib/whatsapp/evolution"); result=await evolutionLogout(body.instance); }
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

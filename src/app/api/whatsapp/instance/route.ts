import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { evolutionCreateInstance, evolutionStatus } from "@/lib/whatsapp/evolution";
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

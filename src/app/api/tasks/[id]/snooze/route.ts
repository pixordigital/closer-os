import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const schema=z.object({ hours:z.coerce.number().min(1).max(72).default(24), days:z.coerce.number().min(0).max(30).optional() });

export async function POST(req:Request, { params }: { params: Promise<{ id: string }> }){
  const { id }=await params;
  const { organizationId, userId }=await requireTenant();
  const body=await req.json().catch(()=>null);
  const p=schema.safeParse(body ?? { hours:24 });
  if(!p.success) return NextResponse.json({ error:p.error.flatten() }, { status:400 });
  const t=await prisma.task.findFirst({ where:{ id, organizationId } });
  if(!t) return NextResponse.json({ error:"Task not found" }, { status:404 });
  const due=new Date(Date.now() + (p.data.days? p.data.days*86400000 : p.data.hours*3600000));
  const updated=await prisma.task.update({ where:{ id }, data:{ dueDate:due, status:"TODO" as never } });
  await auditLog({ organizationId, userId, action:"task.snoozed", entityType:"Task", entityId:id, metadata:{ hours:p.data.hours, due } as never });
  // also reschedule calendar if needed
  try{
    const conn=await prisma.integrationConnection.findFirst({ where:{ organizationId, provider:"google-calendar", status:"connected" } });
    if(conn){
      const { GoogleCalendarProvider }=await import("@/lib/integrations/providers/googleCalendar");
      const prov=new GoogleCalendarProvider();
      await prov.createEvent(conn.config as never, { summary:`[Snoozed] ${t.title}`, start: due.toISOString(), end: new Date(due.getTime()+30*60000).toISOString() }).catch(()=>{});
    }
  }catch{}
  return NextResponse.json(updated);
}

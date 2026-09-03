import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { GoogleCalendarProvider } from "@/lib/integrations/providers/googleCalendar";

export async function GET(){
  const { organizationId } = await requireTenant();
  const conn=await prisma.integrationConnection.findFirst({ where:{ organizationId, provider:"google-calendar" } });
  if(!conn) return NextResponse.json({ error:"Calendar não conectado — GET /api/calendar/auth" }, { status:400 });
  const p=new GoogleCalendarProvider();
  try{
    const events=await p.listEvents(conn.config as never);
    return NextResponse.json({ events });
  }catch(e){ return NextResponse.json({ error:String(e) }, { status:500});}
}
export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null) as { summary?:string, start?:string, end?:string, attendees?:string[], description?:string }|null;
  if(!body?.summary || !body.start || !body.end) return NextResponse.json({ error:"summary, start, end required (ISO)" }, { status:400 });
  const conn=await prisma.integrationConnection.findFirst({ where:{ organizationId, provider:"google-calendar" } });
  if(!conn) return NextResponse.json({ error:"Calendar não conectado" }, { status:400 });
  const p=new GoogleCalendarProvider();
  const res=await p.createEvent(conn.config as never, { summary: body.summary, description: body.description, start: body.start, end: body.end, attendees: body.attendees });
  return NextResponse.json(res);
}

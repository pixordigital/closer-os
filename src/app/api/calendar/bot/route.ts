import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema=z.object({ meetingUrl:z.string().url(), dealId:z.string().cuid().optional().nullable(), title:z.string().max(120).optional() });

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { meetingUrl, dealId, title }=parsed.data;
  // stub bot recorder — cria Call com bot flag e agenda transcrição async
  const call=await prisma.call.create({ data:{ organizationId, dealId: dealId ?? null, title: title ?? `Bot: ${meetingUrl.slice(0,40)}`, status:"SCHEDULED" as never, analysisStatus:"PENDING" as never } });
  // In production, here would call Recall.ai / Fireflies API to join Meet/Zoom. Stub logs.
  await prisma.auditLog.create({ data:{ organizationId, action:"bot.scheduled", entityType:"Call", entityId:call.id, metadata:{ meetingUrl, provider: meetingUrl.includes("meet.google.com")?"meet":"zoom" } as never } as never });
  return NextResponse.json({ ok:true, callId: call.id, message:"Bot agendado (stub) — em prod chamaria Recall.ai para entrar no Meet/Zoom e transcrever sozinho", meetingUrl });
}

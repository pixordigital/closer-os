import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";
import { evolutionSendText } from "@/lib/whatsapp/evolution";
import { checkLimits, randomDelay, typingDelay, humanize, logSent } from "@/lib/whatsapp/antiban";

const schema=z.object({ instance:z.string().min(2), number:z.string().min(8), text:z.string().min(1).max(4000), dealId:z.string().cuid().optional().nullable() });

export async function POST(req:Request){
  const { organizationId, userId } = await requireTenant();
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { instance, number, text, dealId } = parsed.data;
  const clean = number.replace(/\D/g,"");
  if(clean.length<10) return NextResponse.json({ error:"Número inválido — use 55DDDnumero" }, { status:400 });

  const lim = await checkLimits(organizationId, instance);
  if(!lim.ok) return NextResponse.json({ error: lim.reason, retryMs: (lim as {retryMs:number}).retryMs }, { status:429 });

  const finalText = humanize(text);
  const delay = randomDelay(lim.cfg!);
  const typing = typingDelay(finalText, lim.cfg!);

  // human-like: wait typing + delay (cap 8s) — do not block too long, fire and log
  await new Promise(r=>setTimeout(r, Math.min(2000, delay/2)));

  try{
    const res = await evolutionSendText(instance, clean, finalText, { delayMs: delay + typing, presence:"composing" });
    await logSent(organizationId, instance, clean);
    if(dealId){
      const { prisma } = await import("@/lib/db");
      await prisma.followUp.create({ data:{ organizationId, dealId, type:"WHATSAPP" as never, content: finalText, status:"SENT" as never } as never }).catch(()=>{});
      await prisma.auditLog.create({ data:{ organizationId, userId, action:"whatsapp.sent", entityType:"Deal", entityId:dealId, metadata:{ instance, number: clean } as never } as never });
    }
    return NextResponse.json({ ok:true, antiban:{ delay, typing, instance }, res });
  }catch(e){
    return NextResponse.json({ error:String(e).slice(0,600) }, { status:502 });
  }
}

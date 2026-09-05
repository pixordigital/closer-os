import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";
import { evolutionSendText, evolutionSendMedia } from "@/lib/whatsapp/evolution";
import { checkLimits, randomDelay, typingDelay, humanize, logSent, checkNumberCooldown, isOptedOut, pickHealthyInstance } from "@/lib/whatsapp/antiban";

const schema=z.object({
  instance:z.string().min(2).optional().nullable(),
  number:z.string().min(8),
  text:z.string().min(1).max(4000).optional(),
  media:z.string().url().max(4000).optional(),
  mediatype:z.enum(["image","video","audio","document"]).optional(),
  caption:z.string().max(1000).optional(),
  fileName:z.string().max(120).optional(),
  dealId:z.string().cuid().optional().nullable(),
  enqueue:z.boolean().optional().default(false),
});

export async function POST(req:Request){
  const { organizationId, userId } = await requireTenant();
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  let { instance, number, text, media, mediatype, caption, fileName, dealId, enqueue } = parsed.data;
  const clean = number.replace(/\D/g,"");
  if(clean.length<10) return NextResponse.json({ error:"Número inválido — use 55DDDnumero" }, { status:400 });
  if(!text && !media) return NextResponse.json({ error:"text ou media obrigatório" }, { status:400 });

  // auto instance
  if(!instance){
    const picked = await pickHealthyInstance(organizationId);
    if(!picked) return NextResponse.json({ error:"Nenhuma instância conectada — crie em /api/whatsapp/instance" }, { status:400 });
    instance = picked;
  }

  if(await isOptedOut(organizationId, clean)) return NextResponse.json({ error:"Contato opt-out — não enviar" }, { status:403 });
  const cd = await checkNumberCooldown(organizationId, clean, 120000);
  if(!cd.ok) {
    if(enqueue){
      const { enqueueJob } = await import("@/lib/jobs");
      await enqueueJob({ organizationId, type:"whatsapp_send" as never, payload:{ organizationId, to: clean, text, media, mediatype, caption, fileName, instance, dealId } as never, runAt: new Date(Date.now()+ (cd as {retryMs:number}).retryMs) });
      return NextResponse.json({ queued:true, reason: cd.reason, retryMs:(cd as {retryMs:number}).retryMs }, { status:202 });
    }
    return NextResponse.json({ error: cd.reason, retryMs: (cd as {retryMs:number}).retryMs }, { status:429 });
  }
  const lim = await checkLimits(organizationId, instance);
  if(!lim.ok) {
    // queue for retry instead of dropping
    const { enqueueJob } = await import("@/lib/jobs");
    await enqueueJob({ organizationId, type:"whatsapp_send" as never, payload:{ organizationId, to: clean, text, media, mediatype, caption, fileName, instance, dealId } as never, runAt: new Date(Date.now()+ (lim as {retryMs:number}).retryMs) });
    return NextResponse.json({ queued:true, reason: lim.reason, retryMs:(lim as {retryMs:number}).retryMs }, { status:202 });
  }
  // explicit enqueue flag -> queue with antiban stagger
  if(enqueue){
    const { enqueueJob } = await import("@/lib/jobs");
    const delay = randomDelay(lim.cfg!);
    await enqueueJob({ organizationId, type:"whatsapp_send" as never, payload:{ organizationId, to: clean, text, media, mediatype, caption, fileName, instance, dealId } as never, runAt: new Date(Date.now()+ delay) });
    return NextResponse.json({ queued:true, instance, delayMs: delay }, { status:202 });
  }

  const finalText = text ? humanize(text) : undefined;
  const delay = randomDelay(lim.cfg!);
  const typing = finalText ? typingDelay(finalText, lim.cfg!) : 0;

  await new Promise(r=>setTimeout(r, Math.min(2000, delay/2)));

  try{
    let res: unknown;
    if(media){
      const mt = mediatype ?? (media.match(/\.(mp3|ogg|wav)(\?|$)/i) ? "audio" : media.match(/\.(mp4|mov)(\?|$)/i) ? "video" : media.match(/\.(pdf|docx?)(\?|$)/i) ? "document" : "image") as "image"|"video"|"audio"|"document";
      if(mt==="document") res = await evolutionSendMedia(instance, clean, "document", media, caption ?? finalText);
      else if(mt==="audio") { const { evolutionSendAudio } = await import("@/lib/whatsapp/evolution"); res = await evolutionSendAudio(instance, clean, media); }
      else res = await evolutionSendMedia(instance, clean, mt, media, caption ?? finalText);
      // for document with custom filename
      if(mt==="document" && fileName){
        const { evolutionSendDocument } = await import("@/lib/whatsapp/evolution");
        res = await evolutionSendDocument(instance, clean, media, fileName, caption ?? finalText);
      }
    } else {
      res = await evolutionSendText(instance, clean, finalText!, { delayMs: delay + typing, presence:"composing" });
    }
    await logSent(organizationId, instance, clean);
    if(dealId){
      const { prisma } = await import("@/lib/db");
      await prisma.followUp.create({ data:{ organizationId, dealId, type:"WHATSAPP" as never, content: finalText ?? caption ?? media ?? "", status:"SENT" as never } as never }).catch(()=>{});
      await prisma.auditLog.create({ data:{ organizationId, userId, action:"whatsapp.sent", entityType:"Deal", entityId:dealId, metadata:{ instance, number: clean } as never } as never });
    }
    return NextResponse.json({ ok:true, antiban:{ delay, typing, instance }, res });
  }catch(e){
    // auto queue on failure for retry
    const msg = String(e).slice(0,600);
    if(msg.includes("429") || msg.includes("rate")){
      const { enqueueJob } = await import("@/lib/jobs");
      await enqueueJob({ organizationId, type:"whatsapp_send" as never, payload:{ organizationId, to: clean, text, media, mediatype, caption, fileName, instance, dealId } as never, runAt: new Date(Date.now()+60000) });
      return NextResponse.json({ queued:true, error: msg, retryMs:60000 }, { status:202 });
    }
    return NextResponse.json({ error: msg }, { status:502 });
  }
}

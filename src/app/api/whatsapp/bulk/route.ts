import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";
import { checkLimits, cfgFor, isOptedOut, pickHealthyInstance } from "@/lib/whatsapp/antiban";
import { prisma } from "@/lib/db";

const itemSchema = z.object({
  number: z.string().min(8).max(20),
  text: z.string().min(1).max(4000).optional(),
  vars: z.record(z.string(), z.string()).optional(),
});
const schema = z.object({
  instance: z.string().min(2).optional().nullable(),
  text: z.string().min(1).max(4000).optional(),
  media: z.string().url().max(4000).optional(),
  mediatype: z.enum(["image","video","audio","document"]).optional(),
  caption: z.string().max(1000).optional(),
  fileName: z.string().max(120).optional(),
  items: z.array(itemSchema).min(1).max(200).optional(),
  numbers: z.array(z.string().min(8)).max(200).optional(),
}).refine(d=> !!(d.text||d.media) && !!(d.items||d.numbers), { message:"text/media + items/numbers required" });

function fill(t:string, vars: Record<string,string>){
  return t.replace(/\{\{(\w+)\}\}/g, (_,k)=> vars[k] ?? `{{${k}}}`);
}

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body=await req.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { instance: inInst, text, media, mediatype, caption, fileName } = parsed.data as Record<string,unknown> as { instance?:string|null; text?:string; media?:string; mediatype?:string; caption?:string; fileName?:string };
  let instance = inInst?.trim() || null;
  if(!instance){
    const picked = await pickHealthyInstance(organizationId);
    instance = picked;
  }
  if(!instance) return NextResponse.json({ error:"Nenhuma instância conectada" }, { status:400 });

  // build queue items normalized to { number, textFinal }
  let queue: Array<{ number:string; text?:string }>= [];
  if(parsed.data.items){
    for(const it of parsed.data.items as Array<{number:string;text?:string;vars?:Record<string,string>}>){
      const base = it.text ?? (text as string|undefined);
      if(!base && !media) continue;
      const t = base ? (it.vars ? fill(base, it.vars) : base) : undefined;
      queue.push({ number: it.number.replace(/\D/g,""), text: t });
    }
  } else if(parsed.data.numbers){
    for(const n of parsed.data.numbers as string[]){
      queue.push({ number: n.replace(/\D/g,""), text: text as string|undefined });
    }
  }
  queue = queue.filter(q=> q.number.length>=10);
  if(queue.length===0) return NextResponse.json({ error:"Nenhum número válido" }, { status:400 });

  // warmup-aware stagger
  const conn = await prisma.integrationConnection.findFirst({ where:{ id: instance! } }).catch(()=>null) as { createdAt:Date }|null;
  const cfg = cfgFor(conn?.createdAt as Date|undefined);
  const staggerMs = Math.ceil(60000 / Math.max(1,cfg.maxPerMinute)) + 800; // buffer 0.8s
  // also respect burst: at least 25s if >12 per 5min => stagger covers it (8/min = 7.5s, ok)
  // quick limit check: preview counts
  const lim = await checkLimits(organizationId, instance!);
  if(!lim.ok){
    // still queue but inform start delay
  }

  const { enqueueJob } = await import("@/lib/jobs");
  let queued=0, skippedOptout=0, skippedInvalid=0;
  const now = Date.now();
  for(let i=0;i<queue.length;i++){
    const q = queue[i]!;
    if(await isOptedOut(organizationId, q.number)){ skippedOptout++; continue; }
    if(!q.text && !media){ skippedInvalid++; continue; }
    // distribute instances round-robin if multiple
    // pickHealthy not per item (costly); keep single instance unless overloaded
    const runAt = new Date(now + i * staggerMs);
    await enqueueJob({
      organizationId,
      type:"whatsapp_send" as never,
      payload:{ organizationId, to: q.number, text: q.text, media, mediatype, caption, fileName, instance } as never,
      runAt,
    } as never);
    queued++;
  }

  await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.bulk_queued", entityType:"WhatsApp", entityId: instance!, metadata:{ queued, skippedOptout, skippedInvalid, staggerMs, maxPerMinute: cfg.maxPerMinute } as never } as never }).catch(()=>{});

  return NextResponse.json({ ok:true, queued, skippedOptout, skippedInvalid, staggerMs, instance, maxPerMinute: cfg.maxPerMinute, estimateMin: Math.ceil(queued * staggerMs/60000) });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";
import { getIntegration } from "@/lib/integrations/registry";

const schema = z.object({
  to: z.string().email().max(254),
  subject: z.string().min(2).max(200),
  html: z.string().min(1).max(100_000),
  dealId: z.string().cuid().optional().nullable(),
  type: z.enum(["EMAIL","WHATSAPP","LINKEDIN","CRM_NOTE"]).optional().default("EMAIL"),
});

export async function POST(req:Request){
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  const { to, subject, html, dealId, type } = parsed.data;

  if(dealId){
    const d = await prisma.deal.findFirst({ where:{ id: dealId, organizationId } });
    if(!d) return NextResponse.json({ error:"Deal not found" }, { status:404 });
  }

  // pick email integration for org or fallback mock
  let providerName = "mock-email";
  let cfg: Record<string,unknown> = {};
  const conn = await prisma.integrationConnection.findFirst({ where:{ organizationId, kind:"email", status:"connected" }, orderBy:{ updatedAt:"desc" } });
  if(conn){ providerName = conn.provider; cfg = (conn.config as Record<string,unknown>) ?? {}; }

  let messageId: string;
  try{
    const p = getIntegration(providerName);
    if(!p.sendEmail) throw new Error(`provider ${providerName} does not support sendEmail`);
    const r = await p.sendEmail(cfg, { to, subject, html, dealId: dealId ?? undefined });
    messageId = r.messageId;
  }catch(e){ return NextResponse.json({ error: String(e).slice(0,500) }, { status:502 }); }

  let followUp = null;
  if(dealId){
    followUp = await prisma.followUp.create({ data:{
      organizationId, dealId, type: type as never, subject, content: html, status:"SENT" as never,
    } as never });
  }

  await auditLog({ organizationId, userId, action:"email.sent", entityType:"FollowUp", entityId: followUp?.id ?? messageId, metadata:{ to, dealId, provider: providerName } as never });
  if(dealId) fireTriggers({ organizationId, event:"followup.approved", payload:{ dealId, followUpId: followUp?.id, to }, idempotencyKey:`email.sent:${followUp?.id}` });

  return NextResponse.json({ ok:true, messageId, followUp }, { status:201 });
}

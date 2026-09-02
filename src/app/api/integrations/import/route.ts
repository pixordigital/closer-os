import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { integrationImportSchema } from "@/lib/validations/integration";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getIntegration } from "@/lib/integrations/registry";
import { fireTriggers } from "@/lib/triggers";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`integrations:import:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = integrationImportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { text, url, dealId, contactId, title } = parsed.data;

  if (dealId) {
    const d = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!d) return NextResponse.json({ error: "Deal not found in organization" }, { status: 404 });
  }
  if (contactId) {
    const c = await prisma.contact.findFirst({ where: { id: contactId, organizationId } });
    if (!c) return NextResponse.json({ error: "Contact not found in organization" }, { status: 404 });
  }

  // normalize via transcript provider (mock or future real)
  let content: string;
  let language = "pt-BR";
  try {
    const p = getIntegration("mock-transcript");
    const res = await p.importTranscript!({}, { text: text ?? undefined, url: url ?? undefined });
    content = res.content;
    language = res.language ?? "pt-BR";
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 500) }, { status: 400 });
  }

  const call = await prisma.call.create({
    data: { organizationId, dealId: dealId ?? null, contactId: contactId ?? null, title, status: "COMPLETED" } as never,
  });
  const transcript = await prisma.transcript.create({ data: { callId: call.id, content, language } as never });

  await auditLog({ organizationId, userId, action: "integration.imported_transcript", entityType: "Call", entityId: call.id });
  fireTriggers({ organizationId, event: "call.completed", payload: { id: call.id, dealId: call.dealId }, idempotencyKey: `call.completed:${call.id}` });
  return NextResponse.json({ call, transcript }, { status: 201 });
}

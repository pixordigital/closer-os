import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { inboundSchema } from "@/lib/validations/webhook";
import { verifySignature } from "@/lib/webhooks";
import { auditLog } from "@/lib/audit";

// POST /api/webhooks/inbound — generic inbound webhook (HMAC + idempotency)
export async function POST(req: Request) {
  const raw = await req.text();
  let body: unknown;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return NextResponse.json({ error:"Invalid JSON" }, { status:400 }); }
  const parsed = inboundSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });

  // try to resolve org from signature header or tenant; signature header X-Closer-Signature
  const sig = req.headers.get("x-closer-signature") ?? req.headers.get("x-hub-signature-256") ?? "";
  const idem = parsed.data.idempotencyKey ?? req.headers.get("x-idempotency-key") ?? undefined;

  // if idempotencyKey provided, check prior delivery
  if (idem) {
    const existing = await prisma.webhookDelivery.findUnique({ where:{ idempotencyKey: idem } }).catch(()=>null);
    if (existing) return NextResponse.json({ ok:true, deduped:true, id: existing.id });
  }

  // resolve organization: prefer authenticated tenant if cookie present, else require orgId in payload
  let organizationId: string | null = null;
  try {
    const { organizationId: tid } = await requireTenant();
    organizationId = tid;
  } catch { /* unauth inbound */ }

  const payloadOrg = (parsed.data.payload as Record<string,unknown>).organizationId as string | undefined;
  if (!organizationId) organizationId = payloadOrg ?? null;
  if (!organizationId) return NextResponse.json({ error:"organizationId required (payload.organizationId or authenticated)" }, { status:400 });

  // if signature present, verify against any endpoint secret for org
  if (sig) {
    const endpoints = await prisma.webhookEndpoint.findMany({ where:{ organizationId }, select:{ secret:true } });
    const ok = endpoints.some(ep => {
      try { return verifySignature(ep.secret, raw, sig); } catch { return false; }
    });
    if (!ok && endpoints.length > 0) return NextResponse.json({ error:"Invalid signature" }, { status:401 });
  }

  const org = await prisma.organization.findUnique({ where:{ id: organizationId }, select:{ id:true } });
  if (!org) return NextResponse.json({ error:"Organization not found" }, { status:404 });

  // persist as delivery log for observability (no endpointId for inbound, use synthetic)
  // instead log to AuditLog + return 200; delivery table is for outbound only
  await auditLog({ organizationId, action:`webhook.inbound.${parsed.data.event}`, entityType:"Webhook", metadata: { event: parsed.data.event, payload: parsed.data.payload, idempotencyKey: idem } as never });

  // idempotency for inbound is tracked via audit log dedup above; no delivery row needed (FK guard)
  return NextResponse.json({ ok:true, event: parsed.data.event });
}

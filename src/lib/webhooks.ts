import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { logger } from "./logger";

// §83 Webhooks — outbound delivery with HMAC + idempotency + retry hooks

export const WEBHOOK_EVENTS = [
  "deal.created",
  "deal.updated",
  "call.created",
  "call.completed",
  "roleplay.started",
  "roleplay.completed",
  "followup.created",
  "followup.approved",
  "coaching.completed",
] as const;
export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export function signPayload(secret: string, payload: string): string {
  return "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// queue deliveries for endpoints subscribed to event (called after auditLog)
export async function enqueueWebhookDeliveries(params: {
  organizationId: string;
  event: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId: params.organizationId, enabled: true },
  });
  const matching = endpoints.filter(ep => {
    const events = (ep.events as unknown as string[]) ?? [];
    return events.includes(params.event) || events.includes("*");
  });
  if (matching.length === 0) return;

  const body = JSON.stringify({ event: params.event, organizationId: params.organizationId, payload: params.payload, timestamp: new Date().toISOString() });

  for (const ep of matching) {
    const idempotencyKey = params.idempotencyKey ?? `${params.event}:${(params.payload as Record<string,unknown>).id ?? Date.now()}:${ep.id}`;
    try {
      const sig = signPayload(ep.secret, body);
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          organizationId: params.organizationId,
          event: params.event,
          payload: params.payload as never,
          idempotencyKey,
          status: "pending",
        } as never,
      });

      // fire-and-forget with timeout; persist result; never block caller
      void deliverOne(ep.url, sig, body, delivery.id).catch(err => {
        logger.warn({ msg: "webhook deliver failed", event: params.event, endpointId: ep.id, err: String(err) });
      });
    } catch (e) {
      // unique idempotencyKey violation = already queued
      const msg = String((e as Error).message ?? "");
      if (msg.includes("Unique constraint") || msg.includes("idempotencyKey")) continue;
      logger.warn({ msg: "webhook enqueue failed", event: params.event, endpointId: ep.id, err: msg });
    }
  }
}

async function deliverOne(url: string, signature: string, body: string, deliveryId: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Closer-Signature": signature, "X-Closer-Event": "webhook" },
      body,
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: res.ok ? "success" : "failed",
        attempts: { increment: 1 } as never,
        responseStatus: res.status,
        responseBody: text.slice(0, 4000),
        lastError: res.ok ? null : `HTTP ${res.status}`,
      } as never,
    });
  } catch (e) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", attempts: { increment: 1 } as never, lastError: String(e).slice(0, 2000) } as never,
    }).catch(() => {});
    throw e;
  } finally {
    clearTimeout(t);
  }
}

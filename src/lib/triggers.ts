import { enqueueWebhookDeliveries } from "./webhooks";
import { runAutomations } from "./automation";
import { logger } from "./logger";

// Fire-and-forget triggers after domain writes. Never throw.
export function fireTriggers(params: { organizationId: string; event: string; payload: Record<string, unknown>; idempotencyKey?: string }) {
  const { organizationId, event, payload, idempotencyKey } = params;
  // webhooks (delivery per endpoint) + automation rules (trigger → actions)
  void enqueueWebhookDeliveries({ organizationId, event, payload, idempotencyKey }).catch((e) =>
    logger.warn({ msg: "fireTriggers webhooks failed", event, err: String(e) } as never)
  );
  void runAutomations({ organizationId, trigger: event, payload }).catch((e) =>
    logger.warn({ msg: "fireTriggers automations failed", event, err: String(e) } as never)
  );
}

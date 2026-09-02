// In-memory token bucket — per-process, no Redis.
// ponytail: Map + sliding window, 40 LOC. Swap to Redis (ioredis) when multi-instance.
const buckets = new Map<string, number[]>();

type Opts = { windowMs: number; max: number };

function nowMs() { return Date.now(); }

export function checkRateLimit(key: string, opts: Opts): { ok: boolean; remaining: number; retryAfterMs: number } {
  const n = nowMs();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => n - t < opts.windowMs);
  if (fresh.length >= opts.max) {
    const oldest = fresh[0];
    const retryAfterMs = oldest + opts.windowMs - n;
    buckets.set(key, fresh);
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }
  fresh.push(n);
  buckets.set(key, fresh);
  return { ok: true, remaining: opts.max - fresh.length, retryAfterMs: 0 };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  // Next 16 may expose ip via header in some deploys; fallback
  return "unknown";
}

// Prune empty buckets periodically — avoids leak in long-lived process
if (typeof globalThis !== "undefined" && !(globalThis as unknown as Record<string, unknown>).__rlPrune) {
  (globalThis as unknown as Record<string, unknown>).__rlPrune = true;
  const t = setInterval(() => {
    const n = nowMs();
    for (const [k, arr] of buckets) {
      const fresh = arr.filter((ts) => n - ts < 60_000 * 15);
      if (fresh.length === 0) buckets.delete(k);
      else if (fresh.length !== arr.length) buckets.set(k, fresh);
    }
  }, 60_000 * 5);
  // ponytail: global interval, per-process; no per-request cost
  if (typeof (t as unknown as { unref?: () => void }).unref === "function") (t as unknown as { unref: () => void }).unref!();
}

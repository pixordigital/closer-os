# Closer OS — Security (§6, §89-92, §14)

## Auth (§10, §89)

- Email+password → `bcrypt(10)` → `jose` HS256 JWT 7d in `httpOnly, Secure (prod), SameSite=Lax, 7d` cookie `closer_session`.
- `AUTH_SECRET` must be ≥16 chars (`src/lib/auth.ts` enforces). Generate: `openssl rand -base64 32`.
- `src/proxy.ts` verifies JWT on every non-public route; public: `/login`, `/register`, `/api/auth/*`, `/api/health`, `/api/ready`, `/api/webhooks/inbound`. Handlers re-check `requireTenant()`/`requireSession()`.

## Tenant isolation (§10)

- Every business table has `organizationId`; every query filters `where: { organizationId }` via `requireTenant()` → membership `findFirst`. No cross-org read/write.

## Validation

- Zod at every trust boundary: API body, form, webhook, AI structured output. `safeParse` + `flatten`.

## Headers (§6)

- Set via `next.config.ts` `headers()`:
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Content-Security-Policy` (loose for Next RSC inline — `// ponytail: tighten with nonce when needed`), `Strict-Transport-Security` only when `APP_URL` is `https://`.
- `Cache-Control: no-store` on `/api/health` and `/api/ready`.

## Rate limiting (§6)

- In-memory token bucket `src/lib/rate-limit.ts` (no Redis). Applied to:
  - `POST /api/auth/login` — 10/min per IP
  - `POST /api/auth/register` — 5/min per IP
  - `POST /api/webhooks/inbound` — 30/min per IP
- Returns `429` + `Retry-After`. Upgrade to Redis (`ioredis`) when multi-instance — search `ponytail:` comment.

## Secrets

- Never `NEXT_PUBLIC_*` for secrets. No secrets in client bundle. `.env` not committed; `.env.example` documents required vars. Grep: `grep -R NEXT_PUBLIC src --include="*.ts" --include="*.tsx"`.

## Webhooks (§83)

- Outbound HMAC: `X-Closer-Signature: sha256=<hmac sha256 of body>` (`src/lib/webhooks.ts` `signPayload`). IdempotencyKey per delivery, unique.
- Inbound: verifies `X-Closer-Signature` or `X-Hub-Signature-256` against any endpoint secret for org; 401 on mismatch.

## Audit & observability (§91-92)

- `AuditLog` §91 on every domain write: `user.login|register, deal.created|updated, call.created|analyzed, webhook.*, automation.*`, etc. — includes `organizationId`, `userId`, `entityType`, `metadata`.
- `AIUsage` per LLM call: provider/model/operation/agent/tokens/cost/latency. Aggregates detect cost explosion (§14).
- Structured JSON logs via `src/lib/logger.ts` (`LOG_LEVEL=debug|info|warn|error`, default `info`). `ready` logs on failure.

## Rate limiting upgrade

When multi-instance: replace `src/lib/rate-limit.ts` with Redis token bucket. Keep same interface `checkRateLimit(key, {windowMs, max})`.

## Checklist before prod

- [ ] `AUTH_SECRET` 32+ random chars, not `change-me`
- [ ] `APP_URL` is `https://` (enables HSTS)
- [ ] DB not exposed publicly (compose `5433:5432` only for local; Coolify PG internal)
- [ ] `NEXT_PUBLIC` grep clean
- [ ] Rate limit 429 observed under burst
- [ ] Security headers present (`curl -i`)
- [ ] AuditLog + AIUsage dashboards reviewed

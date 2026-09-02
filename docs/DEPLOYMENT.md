# Closer OS — Deployment (§12, §20-22, §121-122)

> Docker + Coolify only. No Vercel (§21, §136). Single `Dockerfile` (standalone) + `docker-compose.yml`.

## Local

```bash
cp .env.example .env   # fill AUTH_SECRET (openssl rand -base64 32), DATABASE_URL
docker compose up -d db             # PG 16 on 5433 (host PG on 5432)
docker compose up --build -d app    # app:3000, entrypoint runs prisma migrate deploy
curl http://localhost:3000/api/health  # {status:"ok"}
curl http://localhost:3000/api/ready   # {status:"ready", db:"up"} — 503 if DB down
npm run seed   # demo@closer.os / closer123
```

- `DATABASE_URL` locally: `postgresql://closer:closer@localhost:5433/closer_os`
- In Docker network (app→db): `postgresql://closer:closer@db:5432/closer_os`
- Healthchecks: `db` pg_isready (5s), `app` wget /api/health (15s, start 25s). Compose waits for `db` healthy before starting `app`.

## Docker

- Multi-stage: `deps → builder (prisma generate + next build standalone) → runner (node:20-alpine, non-root nextjs)`.
- Entrypoint `docker/entrypoint.sh`: `npx prisma migrate deploy` (retry once) → `node server.js`. Handles cold start and Coolify re-deploy.
- `HEALTHCHECK` in Dockerfile + compose — Coolify / orchestrator uses it.

## Coolify

1. New Resource → Docker Image / Git Repo → point to repo.
2. Env vars: paste `.env` (DATABASE_URL must point to Coolify-managed PG internal DNS, e.g. `postgresql://...@postgres:5432/...`). Set `AUTH_SECRET` (≥16 chars), `APP_URL=https://<domain>` (enables HSTS).
3. Build: `docker build` via Coolify; entrypoint runs `migrate deploy` on start.
4. Domain + HTTPS: Coolify proxy → add domain, enable auto TLS.
5. Backups: prefer Coolify PG automated backups (Daily). Alternative: cron `scripts/backup.sh` + R2 upload (see Backups).
6. Update: `git push` → Coolify auto-deploy → healthcheck gates traffic.

Env checklist for Coolify:
- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `AI_PROVIDER` + at least one `*_API_KEY`, optional `STORAGE_*`, `REDIS_URL`, `LOG_LEVEL=info`.

## Backups & DR (§122)

- Primary: Coolify PG → Backups → Daily → retain 14d → test restore quarterly.
- Fallback script `scripts/backup.sh` (no new deps, uses `pg_dump` in `postgres:16-alpine`):
  ```bash
  DATABASE_URL=postgresql://... ./scripts/backup.sh
  # cron: 0 3 * * * DATABASE_URL=... /app/scripts/backup.sh >> /var/log/backup.log 2>&1
  ```
  Writes `backups/closer_os_YYYYmmdd_HHMMSS.sql.gz`, prunes > `BACKUP_RETENTION_DAYS` (default 14). If `STORAGE_BUCKET` + `STORAGE_ENDPOINT` + `aws` CLI set, uploads to R2/S3 `s3://<bucket>/backups/...`.

## Perf notes

- No Redis/pgvector/CDN in MVP — DB queue and lexical search are sufficient. Add only on measured bottleneck.
- `/api/health` and `/api/ready` return `Cache-Control: no-store`.
- Standalone output; cold start target <30s on Coolify.

## Troubleshooting

- `migrate deploy` fails: check `DATABASE_URL` DNS (Coolify internal hostname), PG reachable, `prisma/migrations` present in image (copied via `prisma` dir).
- `/api/ready` 503: DB down or credentials wrong — check compose/PG logs.
- HSTS missing: set `APP_URL=https://...` — header only added for https.

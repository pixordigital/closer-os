# Closer OS — CLAUDE.md

> AI Sales Operating System — Next.js 16 + TS + Tailwind v4 + Prisma 6 + PostgreSQL 16
> Spec: Master Build Prompt v2.0 (136 sections, 58 pages) — see `docs/ARCHITECTURE.md`

## Commands

```bash
npm run dev              # http://localhost:3000 (Turbopack)
npm run build            # production standalone build
npx tsc --noEmit         # type check
npx prisma validate      # schema check
npx prisma migrate dev --name <name>
npm run seed             # demo@closer.os / closer123
docker compose up -d db  # PG on 5433 (host PG already on 5432)
docker compose up        # db:5433 + app:3000
```

## Architecture

- **Modular monolith** — single Next.js app, no microservices in MVP
- **Multi-tenant** — every business row has `organizationId`; always scope: `where: { organizationId }`
- **Auth** — bcrypt + jose JWT in httpOnly cookie (`src/lib/auth.ts`); `src/middleware.ts` guards non-public routes
- **AI** — never import OpenAI/Anthropic directly; use `AIProvider` abstraction (`src/lib/ai/provider.ts`)
- **Validation** — Zod on every external boundary (API, form, webhook, AI output)
- **DB** — Prisma 6 + PostgreSQL; 27 models covering all §23 entities; pgvector prepared (raw SQL when needed)

## Conventions

- No `any`; no `n8n/Make/Zapier`; no Vercel — Docker + Coolify only
- `src/lib/db.ts` singleton Prisma; `src/lib/audit.ts` for AuditLog
- Route handlers: `schema.safeParse(body)` before DB; return `NextResponse.json`
- Tenant isolation non-negotiable — every query filters by `organizationId`
- AI calls must respect `MODEL_ROUTING` (cheap tasks → cheap models) and write `AIUsage`
- Hallucination control: prompts include "No Evidence = Unknown; mark Inference vs Evidence"

## Structure

```
prisma/{schema.prisma, migrations/, seed.ts}
src/app/{(auth)/,(app)/,api/}
src/components/{ui/,layout/}
src/lib/{db,auth,audit,ai/,validations/}
docs/ARCHITECTURE.md
```

## Security

- JWT httpOnly, Secure, SameSite=Lax; 7-day; `AUTH_SECRET >=16 chars`
- All business queries scoped by `organizationId` + cross-org tested
- Zod at every trust boundary; no secrets in client bundle
- AuditLog on every §91 event

## Deploy

- `Dockerfile` standalone output; `docker-compose.yml` db:5433→5432 + app:3000
- Coolify: Git → env vars → `prisma migrate deploy` → deploy
- Host PG on 5432, project uses 5433 locally; in Docker network `DATABASE_URL=postgresql://closer:closer@db:5432/closer_os`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

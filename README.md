# Closer OS — AI Sales Operating System

Segundo cérebro comercial + simulador de vendas + AI Sales Coach para closers B2B.

> Spec: [Master Build Prompt v2.0](/tmp/8b26532e-ae49-4d90-9c17-a2ee9d02c5bc.pdf) (58 páginas, 136 seções) — ver `docs/ARCHITECTURE.md` para proposta §129.

## Stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 · PostgreSQL 16 · Docker · Coolify

## Quick Start

```bash
cp .env.example .env   # edite AUTH_SECRET e DATABASE_URL
docker compose up -d db
npm install
npx prisma migrate dev
npm run seed           # demo@closer.os / closer123
npm run dev            # http://localhost:3000
```

Demo login: `demo@closer.os` / `closer123` (seed: 3 empresas, 5 contatos, 5 deals, 3 calls, 5 cenários roleplay).

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Next.js dev (Turbopack) |
| `npm run build` | production build (standalone) |
| `npx prisma migrate dev --name <x>` | nova migration |
| `npm run seed` | seed demo data |
| `npx tsc --noEmit` | type check |
| `npx prisma validate` | valida schema |

## Estrutura

```
prisma/{schema.prisma, migrations/, seed.ts}
src/app/{(auth)/,(app)/,api/}   # file-based routing
src/components/{ui/,layout/}     # shadcn primitives + Shell
src/lib/{db,auth,audit,ai/,validations/}
docs/ARCHITECTURE.md             # §129 — proposta arquitetural
```

## Infra

```bash
docker compose up        # db:5433 + app:3000 (host PG já ocupa 5432)
docker compose logs -f db
```

Coolify: conecte repo Git → env vars → `npx prisma migrate deploy` no pre-deploy → deploy.

## Phase 1 — Done

Auth (bcrypt + jose JWT httpOnly), multi-tenant (User/Org/Membership), Prisma schema 27 models (§23), AI Provider Abstraction (§11), Docker + Coolify-ready (§20-21).

Next: Phase 2 — Companies / Contacts / Deals / Pipeline Kanban.

## Docs

- `docs/ARCHITECTURE.md` — proposta completa (§129: 16 itens)
- `prisma/schema.prisma` — schema comentado por seção da spec
- `.env.example` — todas as env vars

## Licença

Privado — Closer OS.

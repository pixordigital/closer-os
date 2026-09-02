# Closer OS — Architecture Proposal (§129)

> Master Build Prompt v2.0 — items 1–16 deliverable before large-scale coding.
> Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 · PostgreSQL 16 · Docker · Coolify

---

## 1. Architecture Proposal

**Modular monolith.** Single Next.js app owns UI, API, jobs, workers. No microservices in MVP (§7, §21).
```
Browser → Next.js (RSC + Route Handlers + Server Actions)
          ├── Prisma → PostgreSQL (15 indexed tables, pgvector-ready)
          ├── AI Provider Abstraction → OpenAI / Anthropic / Gemini / OpenRouter
          ├── Internal Job Queue (DB-backed, no Redis required; Redis optional)
          ├── Storage Abstraction (S3 / MinIO / R2)
          └── Webhooks (inbound/outbound, HMAC + idempotency)
```
Coolify deploys one `Dockerfile` (standalone output). `docker compose up` runs `db + app`.
Why not microservices: team = 1, ops cost, premature boundaries. Split only when a module needs independent deploy/scale.

## 2. Database Schema

Prisma schema `prisma/schema.prisma` — 27 models, 13 enums, all §23 entities.

Core groups:
- **Auth/tenant:** User, Organization, Membership (role: OWNER/ADMIN/MEMBER) — every business row carries `organizationId`; queries always scope `where: { organizationId }`.
- **CRM:** Company, Contact (DecisionRole), Deal (DealStage 9 values), DiscoveryField (13 CLOSER fields × status/source/confidence), pipeline = Deal.stage grouping.
- **Calls:** Call, Transcript (speakerSegments JSON for future diarization).
- **Commercial ops:** Objection, FollowUp (HUMAN-IN-THE-LOOP — draft→review→approve→send), Task, ROIModel (3 scenarios).
- **AI:** AIInsight, AIRecommendation, CoachingSession, AIUsage (cost tracking), AIJob (queue).
- **Roleplay:** RoleplayScenario (hiddenContext JSON), RoleplaySession, RoleplayMessage, RoleplayEvaluation, RoleplayScore; TrainingPlan, TrainingExercise, SellerProfile, SellerSkill (per-skill 0-100).
- **Ops:** Activity, AuditLog (91 event types).

Indexes on: organizationId, companyId, dealId, contactId, callId, stage, expectedCloseDate, createdAt. pgvector column (e.g. `embedding vector(1536)`) added via raw SQL when embeddings enabled — Prisma `Unsupported("vector")` + migration.

## 3. Module Map

```
src/lib/
  db.ts              Prisma singleton
  auth.ts            bcrypt + jose JWT + httpOnly cookie (§10)
  audit.ts           append-only audit helper
  ai/provider.ts     AIProvider interface + registry + model routing
  ai/providers/openai.ts  concrete OpenAI impl (Anthropic stub)
  validations/auth.ts Zod schemas (all external input validated §9)

src/app/
  page.tsx           / → /dashboard or /login
  (auth)/login,register
  (app)/dashboard, pipeline, companies, contacts, calls, roleplay, coaching, …
  api/auth/*, api/health, api/ready, api/companies, api/deals, api/calls/*,
      api/ai/*, api/roleplay/*, api/training/*, api/webhooks/*

prisma/
  schema.prisma
  migrations/
  seed.ts            3 companies / 5 contacts / 5 deals / 3 calls / 5 scenarios (§98)
```

## 4. Directory Structure

```
closer_os/
├── prisma/{schema.prisma, migrations/, seed.ts}
├── src/
│   ├── app/{(auth)/,(app)/,api/}   # file-based routing
│   ├── components/{ui/,layout/}      # shadcn primitives + Shell/Sidebar
│   └── lib/{db,auth,audit,ai/,validations/}
├── docs/{ARCHITECTURE.md,DATABASE.md,AI.md,AGENTS.md,ROLEPLAY.md,COACHING.md,DEPLOYMENT.md,SECURITY.md,ROADMAP.md}
├── Dockerfile          # standalone output, non-root user
├── docker-compose.yml  # db(5433) + app(3000)
├── .env.example
└── package.json
```

## 5. Dependency List

Runtime (intentionally small): `next 16, react 19, prisma @6, @prisma/client, zod, bcryptjs, jose, lucide-react, clsx, tailwind-merge, class-variance-authority`
Dev: `typescript, tailwindcss 4, @tailwindcss/postcss, eslint + eslint-config-next`
Not added yet (when needed): `pgvector` extension, `@aws-sdk/client-s3` (storage), `ioredis` (queue — only if DB queue insufficient). No n8n/Make/Zapier (§19).

## 6. Security Model (§89–92)

- Auth: email+password → bcrypt(10) → JWT(HS256, 7d) in `httpOnly, Secure, SameSite=Lax` cookie. Middleware (`src/middleware.ts`) verifies JWT on every non-public route; Route Handlers re-check `requireSession()`.
- Tenant isolation: every query includes `organizationId`; helper `scope(where, session)` enforces. Tests cover cross-org reads.
- Validation: Zod at every boundary (API body, form, webhook, AI tool args, AI structured output).
- Headers: `X-Frame-Options, HSTS, CSP` via `next.config.ts` `headers()`. CSRF not needed (no cookie-auth XHR from other origins; SameSite=Lax; add `csrf` if cookie + form lands elsewhere).
- Rate limiting: in-memory token bucket middleware for `/api/auth/*` (upgrade to Redis when multi-instance). Secrets never in client bundle, never in `NEXT_PUBLIC_`.
- AuditLog: every §91 event + IP/UA. Activity feed derived from same table.

## 7. AI Architecture (§11–14, 96–97)

- Abstraction: `interface AIProvider { generateText, generateStructured, embed }`; `registerProvider()` at boot from env; app code calls `getProvider()`.
- Model routing (§12): `MODEL_ROUTING` map — cheap tasks → `gpt-4o-mini`, reasoning/coaching → `gpt-4o`, embeddings → `text-embedding-3-small`. Caller passes task tag; provider picks model, or explicit `modelForTask(task)`.
- Cost tracking (§13): every call writes `AIUsage {provider, model, operation, agent, inputTokens, outputTokens, estimatedCost, latencyMs, status}`; dashboard aggregates later.
- Structured outputs (§97): Zod schemas → `response_format: {type:"json_object"}` → `schema.parse()`. One retry with "return only JSON" hint on validation failure.
- Hallucination control (§14): prompt template injects "No evidence = Unknown; mark Inference vs Evidence; include evidence+confidence+whyItMatters+action". Codified in agent prompts.
- Embeddings (§34,79): pgvector `vector(1536)` + `prisma.$queryRaw` cosine search; `searchMemory()` tool wraps it.

## 8. Agent Architecture (§15–17)

One typed class per agent; each declares:
```ts
{ inputSchema: z.ZodType, outputSchema: z.ZodType, tools: ToolName[], prompt: string, permissions: ("READ company" | "WRITE analysis")[] }
```
Tool registry (§17): `getCompany, getContact, getDeal, getCall, getTranscript, getPreviousCalls, getDiscoveryState, getPipeline, calculateROI, searchMemory, getSellerProfile, getRoleplayScenario, getRoleplayHistory, createDraft, createTask` — each checks permissions before executing. Agents run inside AIJob worker; no arbitrary tool calls.

Agents (12): Research, PreCall, CallAnalyst, Discovery, Objection, ROI, FollowUp (CANNOT SEND), Pipeline, Coach, Roleplay, RoleplayEvaluator, TrainingPlanner — specs in `docs/AGENTS.md`.

## 9. Roleplay Architecture (§45–67, 111–113)

- Scenario = `RoleplayScenario` (publicContext visible, hiddenContext JSON hidden from seller). Persona engine (§49) 12 personas × 10 behaviors; difficulty L1–L7 + BOSS.
- Session = `RoleplaySession` (active → messages). Prospect = LLM call per turn with system prompt = hiddenContext + persona + "never reveal hidden info directly; require probing; track what was disclosed". Memory = full message history in prompt (session-scoped; no cross-session leak).
- Adaptive prospect (§51): prompt includes seller performance signals (pitch timing, question quality) → instructions "if premature pitch, become skeptical; if good discovery, reveal urgency".
- Objections injected contextually per `scenario.objections` + difficulty; not random.
- Modes (§55): full_call, discovery_drill, objection_drill, closing_drill, negotiation_drill, executive_drill, cold_start, qualification_drill — implemented as scenario tags + evaluator focus.
- No coaching during simulation (§61); evaluation only on `POST /api/roleplay/sessions/:id/complete`.

Evaluation: structured output → `RoleplayEvaluation {overallScore, skills{discovery,listening,...}, strengths[], weaknesses[], decisiveMoments[], errorTypes[], recommendedExercises[]}`. Scores 0–100 with evidence strings (§64).

## 10. Coaching Architecture (§41–44, 62–71)

Inputs: Call aiInsights + RoleplayEvaluations + Deal outcomes, grouped by `userId`. `SellerProfile` + `SellerSkill[skill]` store rolling scores (sampleSize, trend). `CoachingSession` snapshot per period; `TrainingPlan` + `TrainingExercise` auto-generated from weakest skills.

Loop (§4,105–106): `real call → analysis → weakness → coaching insight → training plan → targeted roleplay → score delta → trend`. Real-call and roleplay scores share skill taxonomy but are tagged `source` (§71) — never blended without label.

Coach style (§115): direct, evidence-based, actionable — e.g. "In 5/8 recent calls you pitched before quantifying impact" not "improve communication".

## 11. Background Job Architecture (§18)

DB-backed queue `AIJob {type, status, payload, result, error, attempts, maxAttempts, runAt}`. Worker = Next.js background task (poll `SELECT … WHERE status=PENDING AND runAt<=now() FOR UPDATE SKIP LOCKED`). Supports pending/running/completed/failed/cancelled, retry with backoff, timeout via `AbortController`, delayed/scheduled via `runAt`, logs per job. No n8n. Redis (`ioredis`) added only if throughput proves DB polling insufficient — schema already supports both.

Jobs: `analyze_transcript`, `generate_followup`, `evaluate_roleplay`, `enrich_company`, `weekly_coaching_rollup`.

## 12. Deployment Architecture (§20–21, 121–122)

- `Dockerfile` multi-stage: deps → builder (`prisma generate + next build` standalone) → runner (node:20-alpine, non-root `nextjs`). Output `standalone` (no need for `npm start` deps).
- `docker-compose.yml`: `db: postgres:16-alpine:5433→5432` (host avoids colliding with host PG on 5432) + `app:3000`. Volumes: `pgdata`. Healthchecks both services.
- Coolify: Git deployment; env vars from `.env`; PG as Coolify-managed service or compose `db`; `DATABASE_URL` points to internal DNS `db:5432` in-stack, `localhost:5433` locally. Steps: `prisma migrate deploy` on start (entrypoint), `seed` once, domain+HTTPS via Coolify proxy, backups via Coolify PG backups or `pg_dump` cron + R2 upload (§122).
- Not Vercel (§21, §136). Self-hostable, Docker-first, Coolify-compatible.

## 13. Development Roadmap

Matches §103 phases — Phase 1 (this PR) done; each later phase is a vertical slice (DB + validation + API + UI + tests + docs):
1. Foundation ✓ (this)
2. CRM Core — Companies/Contacts/Deals/Pipeline (+ Tasks)
3. Discovery — Deal Workspace, DISCOVERY framework, health score
4. Call Intelligence — Calls/Transcripts, AI analysis, missed opportunities, scores
5. AI Foundation — provider wiring, pre-call, follow-up, basic coaching
6. Roleplay Engine — scenarios, prospect simulation, memory, evaluation
7. Personal Coach — profile, skill trends, training planner
8. Intelligence — Command Center, pgvector memory, semantic search, deal risk
9. Automation — jobs, webhooks, automation engine, audit/observability
10. Production — hardening, perf, backups, docs, Coolify deploy
11. Advanced — voice, realtime copilot, external integrations (deferred)

## 14. Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AI cost explosion (unbounded token use) | High | Model routing + per-org monthly cap + AIUsage dashboard + hard cutoff |
| Hallucination (fabricated ROI, fake scarcity §5) | High | Structured outputs + evidence field required + "No Evidence = Unknown" prompt + human-in-the-loop (§127) |
| pgvector migration complexity | Medium | Ship without vectors; raw SQL migration when needed; keep text search fallback |
| DB queue throughput ceiling | Medium | Keep queue simple; load-test at ~100 jobs/min; switch to Redis only on evidence |
| Multi-tenant leak | High | Mandatory orgId scoping helper + cross-org integration test + audit |
| Next.js 16 proxy/middleware churn | Low | Pin Next.js minor; isolated proxy file; tests cover auth redirects |

## 15. Product Risks

| Risk | Mitigation |
|------|------------|
| Roleplay feels like chatbot (§46,113) | Hidden context + persona behaviors + adaptive prompts + decisive moments; user testing against real-call transcripts |
| Over-gamification (§108–109) | Streak/levels are opt-in, subtle; default is coaching, not badges |
| Building "ChatGPT for sellers" (§2) | Learning loop gates every feature — data→training→behavior→revenue; no raw chat without context |
| Premature integrations (§85) | Calendar/transcript manual in MVP; adapter interfaces stubbed, not implemented |
| Fake precision (§110) | Scores are decision-support signals with confidence + evidence, never "83.4% win probability" |

## 16. MVP Acceptance Criteria (§124)

Phases 2–6 deliver the checklist (§124): register→org→company→contact→deal→pipeline→workspace→discovery→transcript→analysis→missed opportunities→follow-up→coaching→scenario→roleplay→memory→hidden context→adaptive prospect→evaluation→decisive moments→skill scores→training recs→org isolation→tests pass→docker up→Coolify deploy.

---

*Phase 1 implements §16 acceptance: auth + org + multi-tenant + AI abstraction + DB foundations. Next PR is Phase 2.*

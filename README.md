# ShadowSpark Enterprise Fintech OS

**Backend API** · Next.js 15 App Router · Prisma + Neon PostgreSQL · BullMQ + Redis · Vercel

> Full admin reference: [admin_file.md](./admin_file.md)

---

## Production URLs

| Service | URL |
|---------|-----|
| Backend API | `https://shadowspark-production-one.vercel.app` |
| Marketing site | `https://shadowspark-production.vercel.app` |
| Dashboard | `https://app.shadowspark.tech` |

**Demo login:** `admin@shadowspark.tech` / `Demo@2026!`

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **ORM:** Prisma v7 + Neon PostgreSQL (PrismaPg adapter)
- **Auth:** Custom HMAC-SHA256 JWT (`JWT_SECRET` in Vercel env)
- **Jobs:** BullMQ + Redis
- **Hosting:** Vercel (branch: `master`)
- **Package manager:** pnpm

---

## Key API Routes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Public health check |
| POST | `/api/v1/auth/login` | Returns JWT with `userId`, `tenantId`, `role` |
| GET | `/api/v1/auth/me` | Requires Bearer token |
| GET | `/api/v1/loans` | Paginated, tenant-scoped |
| POST | `/api/v1/loans` | Requires `Idempotency-Key` header |
| PATCH | `/api/v1/loans/:id` | State-machine-enforced; requires `Idempotency-Key` |
| POST | `/api/v1/loans/:id/assign` | Requires `Idempotency-Key` |
| GET | `/api/v1/kyc/pending` | KYC queue |
| GET | `/api/v1/kyc/:id` | KYC document detail |
| POST | `/api/v1/kyc/:id/verify` | Requires `Idempotency-Key`; writes immutable history |
| POST | `/api/v1/kyc/:id/request-info` | Requires `Idempotency-Key` |
| POST | `/api/v1/kyc/:id/ocr` | Queues OCR job (non-blocking) |
| GET | `/api/v1/messages` | Tenant-scoped messages |
| GET | `/api/v1/messages/conversations` | Conversation list |
| POST | `/api/v1/messages/send` | Stores `QUEUED`, requires `Idempotency-Key` |
| GET | `/api/v1/workflows` | List workflows |
| POST | `/api/v1/workflows` | Create workflow; requires `Idempotency-Key` |
| POST | `/api/v1/workflows/:id/execute` | Execute workflow; requires `Idempotency-Key` |
| POST | `/api/v1/api-keys` | Server-side only; requires `Idempotency-Key` |
| DELETE | `/api/v1/api-keys/:id` | Revoke API key; requires `Idempotency-Key` |
| POST | `/api/v1/invitations` | Invite user; requires `Idempotency-Key` |
| POST | `/api/v1/settings` | Audit-logged settings change; requires `Idempotency-Key` |

All mutation routes require `Idempotency-Key` header (returns 400 if missing). Cross-tenant resource access returns 404.

---

## Local Development

```bash
pnpm install
vercel env pull .env.local
pnpm dev
```

## Build & Deploy

```bash
pnpm build          # verify build
npx tsc --noEmit    # typecheck
vercel --prod --yes # deploy to production
```

## Database

Schema is synced via `prisma db push` (not `migrate deploy`) — production DB has pre-existing tables not tracked by migration history. See `prisma/schema.prisma` for all models.

To seed: run `POST /api/internal/seed` with `x-seed-secret` header (deploy endpoint temporarily, remove after).

---

## Workers

Background workers use BullMQ + Redis:

```bash
pnpm worker:message   # delivers messages (Twilio or mock provider)
pnpm worker:kyc-ocr   # processes KYC OCR jobs
```

---

## Demo

Run the full backend demo (typecheck + tests + endpoint summary):

```bash
./scripts/demo-backend.sh
```

---

## Architecture Notes

- Multi-tenant: every model has `tenantId`; all queries must be scoped
- `PrismaClient` requires `{ adapter: new PrismaPg(pool) }` — plain `new PrismaClient()` throws
- `main` branch has no shared history with `master`; production deploys use `vercel --prod --yes`
- CORS allowlist in `src/lib/cors.ts`

See [admin_file.md](./admin_file.md) for full credentials, endpoint reference, and operational history.

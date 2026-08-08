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
| GET | `/api/health` | Health check |
| POST | `/api/v1/auth/login` | Returns JWT |
| GET | `/api/v1/auth/me` | Requires Bearer token |
| GET | `/api/v1/loans` | Paginated, tenant-scoped |
| POST | `/api/v1/loans` | Requires `Idempotency-Key` header |
| GET | `/api/v1/kyc/pending` | KYC queue |
| POST | `/api/v1/kyc/:id/verify` | Requires `Idempotency-Key` |
| GET | `/api/v1/messages/conversations` | Conversation list |
| POST | `/api/v1/messages/send` | Requires `Idempotency-Key` |
| GET | `/api/v1/tenant` | Tenant profile + stats |

All mutation routes require `Idempotency-Key` header (returns 400 if missing).

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

## Architecture Notes

- Multi-tenant: every model has `tenantId`; all queries must be scoped
- `PrismaClient` requires `{ adapter: new PrismaPg(pool) }` — plain `new PrismaClient()` throws
- `main` branch has no shared history with `master`; production deploys use `vercel --prod --yes`
- CORS allowlist in `src/lib/cors.ts`

See [admin_file.md](./admin_file.md) for full credentials, endpoint reference, and operational history.

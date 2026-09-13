# ShadowSpark Operations Reference
> Last reviewed: 2026-08-24

---

## Access Control

This repository must not contain login credentials, privileged account
identifiers, production tokens, signing keys, or database connection strings.

- Store production secrets in the hosting provider's encrypted environment or
  the approved secret manager.
- Store privileged identities in the authoritative identity and database
  systems, not in operational documentation.
- Use synthetic, non-production accounts for demos and tests.
- Treat any value previously committed here as compromised and follow the
  private incident-response process before relying on it.

---

## Production URLs

These entries are a routing inventory, not proof of current health. Verify each
service and its owner before an operational change.

| Service | URL |
|---------|-----|
| Backend API | `https://shadowspark-production-one.vercel.app` |
| Marketing site | `https://shadowspark-production.vercel.app` |
| Dashboard (custom domain) | `https://app.shadowspark.tech` |
| Dashboard (Vercel) | `https://shadowspark-dashboard.vercel.app` |

---

## Key API Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/health` | None | Health check — DB + Redis |
| POST | `/api/v1/auth/login` | None | Returns JWT token |
| POST | `/api/v1/auth/register` | None | Creates Tenant + Membership |
| GET | `/api/v1/auth/me` | Bearer JWT | Returns `{ user, tenant }` |
| GET | `/api/v1/loans` | Bearer JWT | Paginated loan list |
| POST | `/api/v1/loans` | Bearer JWT + Idempotency-Key | Create loan |
| GET | `/api/v1/loans/:id` | Bearer JWT | Single loan |
| PATCH | `/api/v1/loans/:id` | Bearer JWT + Idempotency-Key | Update status |
| GET | `/api/v1/kyc/pending` | Bearer JWT | Pending KYC queue |
| POST | `/api/v1/kyc/:id/verify` | Bearer JWT + Idempotency-Key | Verify/reject KYC |
| GET | `/api/v1/messages/conversations` | Bearer JWT | Conversation list |
| GET | `/api/v1/messages` | Bearer JWT | Messages by loanApplicationId |
| POST | `/api/v1/messages/send` | Bearer JWT + Idempotency-Key | Send message |
| GET | `/api/v1/tenant` | Bearer JWT | Tenant profile + stats |

---

## Auth Flow

```text
POST /api/v1/auth/login
  Returns: { "user": {...}, "token": "<JWT>" }

All protected routes:
  Header: Authorization: Bearer <token>

Mutation routes additionally require:
  Header: Idempotency-Key: <unique-uuid-per-request>
```

JWTs use HMAC-SHA256. Their payload contains `sub`, `tenantId`, `role`,
`email`, `iat`, and `exp`. The signing key must exist only in the encrypted
production environment or approved secret manager.

---

## Database

| Item | Detail |
|------|--------|
| Provider | Neon PostgreSQL (serverless) |
| ORM | Prisma |
| Client path | `src/generated/prisma/client` |
| Adapter | `PrismaPg` (`pg` pool) |
| Schema | `prisma/schema.prisma` |

Database contents, tenant identifiers, seeded identities, and access values
must be verified through the authoritative production account. Do not copy
them into this repository.

---

## Infrastructure

| Item | Detail |
|------|--------|
| Hosting | Vercel (serverless) |
| Repository | `SHADOWSPARK-TECHNOLOGIES/shadowspark-production` |
| GitHub default branch | `main` |
| Documented legacy production branch | `master` — verify before use |
| Build | `pnpm build` |
| Package manager | pnpm |

Required production variable names may be documented, but their values must
not be committed:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL connection for controlled maintenance |
| `JWT_SECRET` | Custom JWT signing key |
| `NEXTAUTH_SECRET` | Auth.js session-signing secret |
| `SEED_SECRET` | One-time seed authorization; remove after use |

---

## Security Invariants

- Derive tenant identity from verified authentication context.
- Require idempotency keys on retryable mutation routes.
- Use HttpOnly, Secure, SameSite cookies for browser-held session tokens.
- Never store authentication tokens in operational documentation.
- Verify allowed origins against the currently deployed domains.
- Rotate an exposed credential and invalidate affected sessions before closing
  an incident; deleting documentation alone is not remediation.

---

## Developer Quick Start

```bash
git clone https://github.com/SHADOWSPARK-TECHNOLOGIES/shadowspark-production
cd shadowspark-production
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

Obtain development-only environment variables through the approved onboarding
process. Never pull or copy production values into a developer workstation or
commit them to Git.

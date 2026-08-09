# ShadowSpark Admin Reference File
> Last updated: 2026-08-08 | Maintained by: Copilot CLI

---

## 🔐 Demo / Seed Credentials

| Resource | Value |
|----------|-------|
| Admin email | `admin@shadowspark.tech` |
| Admin password | `Demo@2026!` |
| Admin role | `ADMIN` |
| Tenant ID | `tenant_demo` |
| Tenant name | `ShadowSpark Demo` |
| Company name | `ShadowSpark Technologies` |

---

## 🌐 Production URLs

| Service | URL | Status |
|---------|-----|--------|
| Backend API | `https://shadowspark-production-one.vercel.app` | ✅ Live |
| Marketing site | `https://shadowspark-production.vercel.app` | ✅ Live |
| Dashboard (app) | `https://app.shadowspark.tech` | ✅ Live |
| Dashboard (vercel) | `https://shadowspark-dashboard.vercel.app` | ✅ Live |

---

## 📡 Key API Endpoints

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

## 🔑 Auth Flow

```
POST /api/v1/auth/login
  Body: { "email": "...", "password": "..." }
  Returns: { "user": {...}, "token": "<JWT>" }

All protected routes:
  Header: Authorization: Bearer <token>

Mutation routes additionally require:
  Header: Idempotency-Key: <unique-uuid-per-request>
```

JWT is custom HMAC-SHA256. Payload: `{ sub, tenantId, role, email, iat, exp }`.  
`JWT_SECRET` is stored in Vercel production env (encrypted).

---

## 🗃️ Database

| Item | Detail |
|------|--------|
| Provider | Neon PostgreSQL (serverless) |
| ORM | Prisma v7.8.0 |
| Client path | `src/generated/prisma/client` |
| Adapter | `PrismaPg` (pg Pool — requires adapter in constructor) |
| Schema | `prisma/schema.prisma` |
| Sync method | `prisma db push` (not migrate deploy — DB has pre-existing schema) |

### Models
`User`, `Tenant`, `TenantMembership`, `LoanApplication`, `KycDocument`, `Message`, `AuditLog`, `IdempotencyKey`

### Seeded Data (production)
- 10 loan applications (`loan_seed_1` → `loan_seed_10`)
- Admin user (`admin@shadowspark.tech`)
- Tenant (`tenant_demo`)
- 1 audit log entry

---

## 🏗️ Infrastructure

| Item | Detail |
|------|--------|
| Hosting | Vercel (serverless) |
| Repo | `SHADOWSPARK-TECHNOLOGIES/shadowspark-production` |
| Branch (prod) | `master` (Vercel watches this) |
| Deploy command | `vercel --prod --yes` |
| Build | `pnpm build` (webpack, not turbopack) |
| Node.js | 22.x |
| Package manager | pnpm |

### Vercel Env Vars (production)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled connection (for Prisma at runtime) |
| `DATABASE_URL_UNPOOLED` | Neon direct TCP (for migrations/seeds) |
| `JWT_SECRET` | HMAC key for custom JWT signing |
| `SEED_SECRET` | *(removed after use)* One-time seed endpoint auth |

---

## 🔒 Security Notes

- CORS allowlist: `app.shadowspark.tech`, `shadowspark-dashboard.vercel.app`, `shadowspark-production.vercel.app`, `shadowspark-production-one.vercel.app`, `localhost:3000/3001`
- JWT uses HMAC double-sign for `timingSafeEqual` (prevents length timing oracle)
- HttpOnly cookie `shadowspark_token` set on login alongside JSON token
- All mutation routes enforce `Idempotency-Key` header (400 if missing)
- Multi-tenant: every model has `tenantId`; all queries scoped to tenant

---

## 📋 Dashboard Pages (app.shadowspark.tech)

| Route | Status | Data source |
|-------|--------|-------------|
| `/dashboard` | ✅ Live | Real loans from `/api/v1/loans` |
| `/dashboard/kyc` | ✅ Live | `/api/v1/kyc/pending` |
| `/dashboard/messages` | ✅ Live | `/api/v1/messages/conversations` |
| `/dashboard/workflows` | ✅ Live | Workflow list + builder |
| `/dashboard/analytics` | ✅ Live | `/api/v1/analytics/dashboard` |
| `/dashboard/settings` | ✅ Live | Tenant + team + API keys |
| `/login` | ✅ Live | JWT stored in localStorage |

---

## 🗂️ Repos

| Repo | Branch | Vercel Project | URL |
|------|--------|----------------|-----|
| `shadowspark-production` | `master` | `shadowspark-production` | `shadowspark-production-one.vercel.app` |
| `shadowspark-dashboard` | `master` | `shadowspark-dashboard` | `app.shadowspark.tech` |

`main` branch in `shadowspark-production` is GitHub default but has **no shared history** with `master`. Branch protection requires 1 review. Production deploys bypass GitHub using `vercel --prod --yes`.

---

## 🧑‍💻 Developer Quick Start

```bash
# Clone and install
git clone https://github.com/SHADOWSPARK-TECHNOLOGIES/shadowspark-production
cd shadowspark-production
pnpm install

# Pull env vars
vercel env pull .env.local

# Run dev
pnpm dev

# Build check
pnpm build

# TypeScript check
npx tsc --noEmit

# Deploy to production
vercel --prod --yes
```

---

## 📅 Operational History

| Date | Event |
|------|-------|
| Apr 2026 | Initial platform built — marketing site, chatbot, operator dashboard |
| Apr 2026 | Infrastructure hardened — keep-alive, DB SSL, Slack alerts |
| Aug 2026 | Dashboard pages built: KYC, Messages, Workflows, Analytics, Settings |
| Aug 2026 | Backend hardened: 7 Prisma models, idempotency middleware, real data services |
| Aug 2026 | Seed script run — 10 loans + admin user in production DB |
| Aug 2026 | All Tier 1 checks verified green |

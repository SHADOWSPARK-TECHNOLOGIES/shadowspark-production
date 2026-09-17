# Project: shadowspark-production — Production Readiness & AI-ASSIST Integration

## Architecture
- **Authenticated Server Boundary**: Next.js App Router (`src/app/api/compliance/*`). Enforces session or JWT authentication, resolves tenant identity from authoritative database membership, and injects server credentials.
- **Service Integration Layer**: `src/lib/ai-assist/*`. Typed upstream client communicating with frozen AI-ASSIST v1.1.0 over HTTPS with `Authorization: Bearer <token>`, `X-Tenant-ID`, and `Idempotency-Key`.
- **Operator Frontend**: Next.js App Router (`src/app/dashboard/*`). Compliance routes under `/dashboard/reviews` and `/dashboard/reviews/[briefId]`. Reuses DataTable, EmptyState, Badge, and Skeleton primitives with full 10-state coverage.
- **Security Perimeter**: Fail-closed tenancy, sensitive PII guard (11-digit national identity numbers), secret leak prevention, ChatWidget containment on compliance surfaces, contained passkey login.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Git State Recovery & File Classification | Record git status, branch, commit, remote, worktrees, preserve Codex work | M0 | Survey (Complete) |
| 2 | Upstream Contract Verification | Read frozen v1.1.0 contract from commit `e438562`, verify endpoints, tenancy, idempotency | M2 | Survey (Complete) |
| 3 | AI-ASSIST Review Queue Listing | Implement `listComplianceReviews` and `/api/compliance/reviews` endpoint (`GET /v1/review-queue`) | M-Adapter | Contract Audit (MISMATCH-1) |
| 4 | Upstream Status 400 Error Mapping | Map upstream 400 Bad Request to 400 (not 502) in `src/lib/ai-assist/errors.ts` | M-Adapter | Contract Audit (MISMATCH-2) |
| 5 | Sharpened Upstream Types | Add `ReviewQueueListResponse`, `ReviewQueueSummary`, `ListReviewsParams` and sharpen types | M-Adapter | Contract Audit (MISMATCH-4) |
| 6 | Server Auth Boundary Bridge | Bridge NextAuth browser session to compliance API, resolving tenant from `TenantMembership` | M-Adapter | Auth Explorer Audit |
| 7 | Adapter Unit & Route Tests (TDD) | Vitest test suite for `listComplianceReviews`, new route tests, and file list assert update | M-Adapter | Contract & Auth Audits |
| 8 | Environment Validation (JWT_SECRET) | Add `JWT_SECRET` to mandatory environment validation in `src/lib/config/validateEnv.ts` | M-Adapter | Auth Explorer Audit |
| 9 | Typecheck Stability Fix | Fix `tests/auth-credentials.test.ts:17` typing cast (`as unknown as CredentialsConfig`) | M-Adapter | Survey Report |
| 10 | Exception Review Queue Page | Implement `/dashboard/reviews` with DataTable, filtering, and 10 required UI states | M-UI | Original Request R4 |
| 11 | Exception Review Detail Page | Implement `/dashboard/reviews/[briefId]` with brief view, immutable annotation trail, 10 states | M-UI | Original Request R4 |
| 12 | Navigation Registration | Add `Exception Review` to `NAV_ITEMS` in `src/lib/dashboard/navigation.ts` under Compliance | M-UI | Auth Explorer Audit |
| 13 | ChatWidget Containment | Suppress `<ChatWidget />` on `/dashboard/*`, `/admin/*`, `/operator/*` routes | M-UI | Auth Explorer Audit |
| 14 | Dashboard Command Centre Restoration | Restore `src/app/dashboard/PageClient.tsx` from commit `8780a9c` (replace stub) | M-UI | Auth Explorer Audit |
| 15 | Remove Hardcoded Dashboard Values | Replace hardcoded avatar name/role and static date in `src/app/dashboard/layout.tsx` | M-UI | Auth Explorer Audit |
| 16 | Repository Clutter Cleanup | Remove orphan `.bak` files (`src/app/(marketing)/page.tsx.sovereign.bak`, etc.) | M-UI | Auth Explorer Audit |
| 17 | Agent OS Durable Rules | Update root `AGENTS.md` with durable repository rules | M-AgentOS | Original Request R6 |
| 18 | Agent OS 7 Skills Creation | Create 7 skills under `.agents/skills/*` with progressive disclosure | M-AgentOS | Original Request R6 |
| 19 | Version & Engine Documentation | Document detected versions (Next.js 16.3.4, React 19.2.4, Node 24.x, etc.) | M-AgentOS | Original Request R7 |
| 20 | Opaque-box E2E Test Suite | Create multi-tier E2E tests for compliance flow, tenant isolation, idempotency | M-E2E-Tests | Project Pattern Dual Track |
| 21 | Full Verification & Security Audit | Pass all tests, typecheck, lint, build, 10 attack surfaces security review | M-Audit | Original Request R8 |
| 22 | Independent Victory Audit | RELEASE_AUDITOR forensic audit of provenance, contract, tests, and build | M-Audit | Original Request R8 |
| 23 | Business / Revenue Impact Check | Document customer, revenue, and production impacts | M-Release | Original Request R10 |
| 24 | Release & Deployment Status | PR creation, CI verification, deployment or `READY_TO_DEPLOY` evidence | M-Release | Original Request R9 |
| 25 | Checkpoint & Compact Handoff | Update `CURRENT_STATE.md`, `ANTIGRAVITY_LEDGER.md`, `HANDOFF.md`, format handoff | M-Release | Original Request R11 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | State Recovery | Git state recorded, untracked/modified files classified, Codex work preserved | none | DONE |
| M2 | Contract Verification | AI-ASSIST v1.1.0 contract verified at commit `e438562`, mismatches cataloged | none | DONE |
| M-Adapter | Production-Safe Server Adapter | Features 3, 4, 5, 6, 7, 8, 9 (client, routes, auth bridge, TDD tests, typecheck) | M0, M2 | DONE (worker_adapter_3) |
| M-UI | Exception Review UI & Frontend Hardening | Features 10, 11, 12, 13, 14, 15, 16 (reviews routes, nav, ChatWidget, PageClient, layout) | M-Adapter | IN_PROGRESS (worker_frontend_1) |
| M-AgentOS | Agent OS & Skills | Features 17, 18, 19 (`AGENTS.md`, 7 `.agents/skills/*`, version docs) | none | DONE (5c6a314a) |
| M-E2E-Tests | Opaque-Box E2E Test Suite | Feature 20 (Test infra, Tier 1-4 tests, `TEST_READY.md`) | M-Adapter, M-UI | DONE (test_writer_1) |
| M-Audit | Verification & Victory Audit | Features 21, 22 (Full test run, security scan, independent auditor gate) | M-E2E-Tests | PLANNED |
| M-Release | Release, Business Check & Handoff | Features 23, 24, 25 (Ledgers, handoff, PR/deployment status, compact handoff) | M-Audit | PLANNED |

---

## Interface Contracts

### 1. Adapter ↔ Compliance API Route (`src/lib/ai-assist/client.ts` ↔ `src/app/api/compliance/*`)
- **List Reviews**:
  - Client Signature: `listComplianceReviews(params: ListReviewsParams): Promise<ReviewQueueListResponse>`
  - Route: `GET /api/compliance/reviews?limit=50&offset=0&state=pending_review`
  - Response: `{ success: true, data: { items: ReviewQueueSummary[], total: number, limit: number, offset: number } }`
- **Get Review**:
  - Client Signature: `getComplianceReview(briefId: string): Promise<ReviewQueueResponse>`
  - Route: `GET /api/compliance/reviews/[briefId]`
  - Response: `{ success: true, data: ReviewQueueResponse }`
- **Add Annotation**:
  - Client Signature: `addComplianceAnnotation(params: AddAnnotationParams): Promise<ReviewQueueResponse>`
  - Route: `POST /api/compliance/reviews/[briefId]/annotations`
  - Headers: `Idempotency-Key: <key>`
  - Body: `{ annotation: string }`
  - Response: `{ success: true, data: ReviewQueueResponse }`

### 2. Frontend ↔ Server Auth Boundary (`src/app/dashboard/reviews/*` ↔ `src/app/api/compliance/*`)
- Browser makes fetch requests with credentials (cookies).
- Compliance route handler inspects `await auth()` (NextAuth session):
  - Extracts `session.user.id`.
  - Queries `prisma.tenantMembership.findFirst({ where: { userId: session.user.id } })` to resolve authoritative `tenantId`.
  - Verifies user role (must be `ADMIN` or authorized user).
  - If no membership or unauthorized: returns 403 Forbidden.
- External API calls continue to support `Authorization: Bearer <jwt>` via `requireAuthContext(request)`.

---

## Code Layout & Bounded Write Ownership
| Bounded Domain | Allowed Paths | Assigned Worker / Milestone |
|---|---|---|
| Adapter & Auth Boundary | `src/lib/ai-assist/*`, `src/app/api/compliance/*`, `src/lib/config/validateEnv.ts`, `tests/ai-assist-client.test.ts`, `tests/api/compliance.test.ts`, `tests/auth-credentials.test.ts` | `worker_adapter` (M-Adapter) |
| Exception Review UI & Frontend | `src/app/dashboard/reviews/*`, `src/lib/dashboard/navigation.ts`, `src/app/dashboard/PageClient.tsx`, `src/app/dashboard/layout.tsx`, `src/components/ChatWidget.tsx` | `worker_frontend` (M-UI) |
| Agent OS & Documentation | `AGENTS.md`, `.agents/skills/*` | `worker_agentos` (M-AgentOS) |
| E2E Testing Track | `tests/e2e/*`, `TEST_INFRA.md`, `TEST_READY.md` | `test_writer` (M-E2E-Tests) |
| Release & Ledgers | `docs/engineering/*` | `worker_release` (M-Release) |

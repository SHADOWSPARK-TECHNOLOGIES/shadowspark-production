# Scope: Generation 4 Production & Revenue Gate

## Architecture
- **M-R1 (Outreach & Telemetry)**: Multi-channel prospect seeding (`scripts/seed-batch01-prospects.ts`), manual/automated dispatch CLI (`scripts/dispatch-outreach.ts`), Meta WhatsApp webhook status receipts (`src/app/api/webhooks/whatsapp/meta/route.ts`), institutional nurture templates (`src/lib/leads/nurture.ts`), real DB evidence telemetry (`scripts/sync-customer-evidence.ts`).
- **M-R2 (Trial Sandbox Provisioning)**: Instant trial tenant provisioning action (`src/app/actions/sandbox.ts`), API route (`src/app/api/sandbox/provision/route.ts`), UI flow (`src/app/sandbox/page.tsx`), seeding synthetic loan exceptions with Prisma Decimal monetary precision, seeding upstream AI-ASSIST briefs in `pending_review`, rejecting unauthenticated account collision with HTTP 409 `EMAIL_ALREADY_EXISTS`.
- **M-R3 (SEC Circular 26-1 Red-Team Compliance)**: Automated adversarial stress harness (`tests/security/red-team-compliance.test.ts`), prompt injection defense (OWASP LLM01:2026), zero cross-tenant data leakage, IDOR brief protection with anti-enumeration 404, double-entry ledger balance invariants.
- **M-R4 (Production Verification & Dual-Worktree Stability)**: Typecheck 0 errors, 44 Vitest test suites (100% pass), secrets test 9/9 pass, Netlify Next.js build clean (80 routes).

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Prospect Seeding | 10 Nigerian fintech targets seeded with multi-channel metadata | M-R1 | DONE |
| 2 | Outreach Dispatch | Mailto/WhatsApp URL generator & Resend dispatch with idempotent tracking | M-R1 | DONE |
| 3 | WhatsApp Telemetry | Delivery/read receipts with signature verification | M-R1 | DONE |
| 4 | Evidence Ledger | Zero fake metrics customer evidence synchronized from live DB | M-R1 | DONE |
| 5 | Sandbox Tenant Provisioning | Instant isolated tenant creation in atomic PostgreSQL tx | M-R2 | DONE |
| 6 | Synthetic Loan Seeding | 3 loan exceptions with exact Prisma.Decimal amounts | M-R2 | DONE |
| 7 | Upstream Brief Seeding | Pre-seeded briefs in pending_review for immediate trial access | M-R2 | DONE |
| 8 | Email Collision Security | Reject unauthenticated collision with 409 EMAIL_ALREADY_EXISTS | M-R2 | DONE |
| 9 | TS2339 Typing Resolution | Add tenantId to ProvisionTrialTenantOutput['loans'] | M-R2 | DONE |
| 10 | Immutable Audit Logging | Log audit trails on compliance actions | M-R2/M-R3 | DONE |
| 11 | SEC 26-1 Red-Team Suite | 19 adversarial stress tests for prompt injection, replay, IDOR | M-R3 | DONE |
| 12 | Test Concurrency Timeouts | Adequate timeouts on CPU-intensive security & challenger tests | M-R4 | DONE |
| 13 | Production Verification Gate | typecheck (0 errors), vitest (44/44 pass), secrets (0 leaks), build | M-R4 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-R1 | Commercial Outreach & Telemetry | Batch 01 outreach, WhatsApp webhooks, evidence ledgers | none | DONE |
| M-R2 | Trial Sandbox Provisioning | Atomic provisioning, TS2339 fix, 409 email collision | none | DONE |
| M-R3 | SEC Circular 26-1 Red-Team Compliance | Adversarial stress harness, tenant isolation, ledger immutability | none | DONE |
| M-R4 | Production Verification & Gate | Timeouts, typecheck, vitest 44 suites, secrets, build, audit | M-R1, M-R2, M-R3 | DONE |

## Interface Contracts
### `src/app/actions/sandbox.ts` & `src/app/api/sandbox/provision/route.ts`
- `provisionTrialTenant(input: ProvisionTrialTenantInput): Promise<ProvisionTrialTenantOutput>`
- If user with `operatorEmail` exists and is not authenticated: throw/return structured error `{ ok: false, error: { code: 'EMAIL_ALREADY_EXISTS', message: '...' } }`, mapping to HTTP 409 in the route.
- `ProvisionTrialTenantOutput.loans` contains `{ id: string; tenantId: string; applicantName: string; applicantPhone: string; loanAmount: Prisma.Decimal; loanPurpose: string | null; status: string; }`.

# Scope: ShadowSpark Commercial Conversion & Pilot Enablement Suite

## Architecture
- **Commercial Outreach & Telemetry (R1)**:
  - Prospect storage in `prisma.lead` with structured `metadata.channels`.
  - Multi-channel dispatch engine (`scripts/dispatch-outreach.ts` & `scripts/seed-batch01-prospects.ts`).
  - Real-time webhook delivery tracking (`/api/webhooks/resend`, `/api/webhooks/whatsapp/meta`).
  - Institutional nurture templates aligned with SEC Circular 26-1 (`src/lib/leads/nurture.ts`).
  - Automated evidence synchronization script (`scripts/sync-customer-evidence.ts`) maintaining zero fake metrics in `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md`.
- **Self-Service Demo Sandbox & Instant Provisioning (R2)**:
  - Instant trial tenant onboarding engine (`src/app/actions/sandbox.ts` / `/api/sandbox/provision`).
  - Atomic PostgreSQL transaction creating isolated `Tenant`, `User`, `TenantMembership` (`role: "COMPLIANCE"`), and 3 synthetic `LoanApplication` exceptions with exact `Prisma.Decimal`.
  - Pre-seeding upstream AI-ASSIST review queue briefs for the new tenant.
  - Live local `AuditLog` emission on annotation submission (`POST /api/compliance/reviews/[briefId]/annotations`).
  - Interactive onboarding UI at `/sandbox` enabling < 3 min time-to-first-reviewed-exception.
- **SEC Circular 26-1 Red-Team Compliance (R3)**:
  - Automated stress test suite (`tests/security/red-team-compliance.test.ts`).
  - Stress testing 4 attack surfaces: adversarial prompt injection (LLM01:2026), cross-tenant replay leakage, unauthorized IDOR brief access, and audit trail tampering.
  - Enforcing immutable non-repudiable audit trails and double-entry invariants.
- **Controlled Stack & Safeguards (R4)**:
  - Server-authoritative tenant isolation derived exclusively from verified session/JWT.
  - Exact monetary precision with `Prisma.Decimal` and BigInt kobo.
  - Fail-closed security on all authentication/tenancy.
  - Secret hygiene (`npm run test:secrets` 0 leaks).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prospect Seeding Engine | Idempotently seeds 10 Batch 01 Nigerian fintechs into `prisma.lead` with channel metadata | M-R1 | R1 Survey |
| 2 | Multi-Channel Dispatch Engine | CLI supporting live Resend email, 1-click links, and manual LinkedIn/WhatsApp dispatch logging | M-R1 | R1 Survey |
| 3 | WhatsApp Webhook Persistence | Persist WhatsApp message delivery events (`delivered`, `read`, `failed`) into `Lead.metadata` | M-R1 | R1 Survey |
| 4 | Institutional Nurture Templates | Replace deprecated $10 audit consumer copy with SEC Circular 26-1 / pilot offer templates | M-R1 | R1 Survey |
| 5 | Automated Evidence Reconciliation | Script `sync-customer-evidence.ts` syncing `CUSTOMER_EVIDENCE.md` and `FIRST_5_CUSTOMERS.md` from database | M-R1 | R1 Survey |
| 6 | Instant Trial Tenant Provisioning | Server action / API provisioning isolated `Tenant` + `TenantMembership` with role `COMPLIANCE` | M-R2 | R2 Survey |
| 7 | Synthetic Exception Dataset Seeding | Seed 3 realistic Nigerian fintech loan exceptions with exact `Prisma.Decimal` amounts | M-R2 | R2 Survey |
| 8 | Upstream AI Brief Seeding | Automatically call `createComplianceBrief` for trial exceptions so review queue is populated | M-R2 | R2 Survey |
| 9 | Local Audit Log on Annotation | Emit immutable `prisma.auditLog` on `POST /api/compliance/reviews/[briefId]/annotations` | M-R2 | R2 Survey |
| 10 | Interactive Sandbox UI | Build `/sandbox` route with 1-click presets for the 10 institutions and rapid auto-login | M-R2 | R2 Survey |
| 11 | Adversarial Prompt Injection Test | Verify LLM01:2026 injection notes are flagged without mutating source-of-record status | M-R3 | R3 Survey |
| 12 | Cross-Tenant Replay Test | Verify zero data leakage across tenants under idempotency replay and header spoofing | M-R3 | R3 Survey |
| 13 | IDOR Probe & Anti-Enumeration Test | Verify cross-tenant brief access returns indistinguishable 404 NOT_FOUND | M-R3 | R3 Survey |
| 14 | Audit Trail Non-Repudiation Test | Verify append-only audit logs and double-entry balance invariant ($\sum D = \sum C$) | M-R3 | R3 Survey |
| 15 | Full Stack Regression Verification | Verify `npm test` (all files pass), `npm run test:secrets`, `npm run typecheck`, and build | M-R4 | R4 Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-R1 | Commercial Outreach & Telemetry | Features 1, 2, 3, 4, 5 (Seeding, dispatch CLI, webhooks, nurture, evidence sync, tests) | Phase 0 | IN_PROGRESS (worker_outreach_1) |
| M-R2 | Sandbox & Instant Provisioning | Features 6, 7, 8, 9, 10 (Trial tenant provisioning, exception seeding, UI, audit logs, tests) | Phase 0 | IN_PROGRESS (worker_sandbox_1) |
| M-R3 | SEC Circular 26-1 Red-Team Suite | Features 11, 12, 13, 14 (Automated red-team tests for injection, leakage, IDOR, audit trails) | Phase 0 | IN_PROGRESS (worker_redteam_1) |
| M-R4 | Controlled Stack & Full Verification | Feature 15 (Full verification: npm test, secrets scan, typecheck, build, audit gate) | M-R1, M-R2, M-R3 | PLANNED |

---

## Code Layout & Bounded Write Ownership
| Milestone | Assigned Role / Worker | Bounded Write Paths | Forbidden Paths |
|---|---|---|---|
| M-R1 | `worker_outreach_1` | `scripts/seed-batch01-prospects.ts`, `scripts/dispatch-outreach.ts`, `scripts/sync-customer-evidence.ts`, `src/app/api/webhooks/whatsapp/meta/route.ts`, `src/lib/leads/nurture.ts`, `src/workers/follow-up-worker.ts`, `tests/outreach-pipeline.test.ts`, `docs/CUSTOMER_EVIDENCE.md`, `docs/FIRST_5_CUSTOMERS.md` | `src/app/dashboard/*`, `src/app/sandbox/*`, `src/app/api/compliance/*`, `prisma/schema.prisma` |
| M-R2 | `worker_sandbox_1` | `src/app/actions/sandbox.ts`, `src/app/api/sandbox/*`, `src/app/(marketing)/sandbox/*`, `src/app/api/compliance/reviews/[briefId]/annotations/route.ts`, `tests/sandbox-provisioning.test.ts` | `scripts/dispatch-outreach.ts`, `scripts/seed-batch01-prospects.ts`, `docs/CUSTOMER_EVIDENCE.md`, `src/lib/ledger/*` |
| M-R3 | `worker_redteam_1` | `tests/security/red-team-compliance.test.ts`, `tests/security/prompt-injection.test.ts` | Implementation code outside tests |
| M-R4 | `teamwork_preview_auditor` | Read-only audit across entire repo | Any write |

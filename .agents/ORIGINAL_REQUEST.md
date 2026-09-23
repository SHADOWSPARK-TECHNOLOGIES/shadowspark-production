# Original User Request

## 2026-09-16T13:45:03Z

Take complete ownership of every meaningful remaining engineering task in **shadowspark-production** previously assigned to Codex. Operate autonomously from repository evidence. Consume the verified AI-ASSIST v1.1.0 contract, complete the production-safe adapter, finish Exception Review, resolve auth/RBAC/tenant integration, remove verified security/production defects, and reach a production-ready state.

Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production
Integrity mode: development

---

## Known Context

- AI-ASSIST PR #2 merged into main; merge commit `e4385628c9fffcacc904d7b963a594aa206015bf`; CI passed.
- AI-ASSIST v1.1.0 is deployed on Render; health endpoint verified; production fails closed without tenant identity; tenant-aware contract verified; consumer adapter gate OPEN.
- Do NOT blindly trust historical frontend state — recover from repository evidence.
- Google is retiring Antigravity Workflows November 1, 2026. Use Agent Skills, not workflows.

---

## Requirements

### R0. Recover and reconcile Codex state

Before touching any file, record the current Git state:

```
git branch --show-current
git rev-parse HEAD
git status --short --branch
git remote -v
git worktree list
git log --oneline --decorate -20
```

Read if present: `AGENTS.md`, `docs/engineering/CURRENT_STATE.md`, `docs/engineering/CODEX_LEDGER.md`, `docs/engineering/HANDOFF.md`, `docs/engineering/DECISIONS.md`, `.agents/skills/*`, `.codex/*`.

Classify every modified/untracked file. Do NOT `git reset --hard`, `git clean -fd/x`, or `checkout -- .`. Do NOT overwrite or delete unknown Codex work.

### R1. Build and coordinate the agent team

Dispatch independent subagents in parallel with bounded write domains:

| Role | Responsibilities |
|---|---|
| REPO_EXPLORER | Architecture recovery, adapter/compliance location, Codex change identification |
| AI_ASSIST_CONTRACT_AUDITOR | Read frozen v1.1.0 contract; compare against live/deployed behavior where safe |
| AUTH_TENANT_SECURITY | NextAuth/auth boundary, tenant resolution, RBAC, service auth, credential boundaries |
| ADAPTER_ENGINEER | `src/lib/ai-assist/*`, `/api/compliance/*`, missing/stale behavior |
| FRONTEND_REVIEW_ENGINEER | Exception Review route, dashboard composition, states/accessibility/error UX |
| TEST_ENGINEER | Adapter tests, RBAC/tenant tests, frontend/integration gaps |
| RELEASE_AUDITOR | Independent verification only; must NOT author the implementation being audited |

Rule: many readers, one writer per bounded domain. No overlapping writers on the same files.

### R2. Verify the AI-ASSIST v1.1.0 contract

Read the actual upstream contract. Verify: authentication, service authentication, tenant semantics (`X-Tenant-ID`, `X-Tenant-Slug` if applicable), idempotency, review queue, brief creation, brief retrieval, annotation, pagination, filtering, error semantics, source-of-record behavior.

Do not invent endpoints. If live behavior differs materially from the frozen contract, mark `CONTRACT_MISMATCH` and resolve upstream truth before implementing.

### R3. Implement the production-safe server adapter

Required architecture:

```
Browser
  ↓
ShadowSpark authenticated server boundary
  ↓
user/session validation → membership/RBAC validation → trusted tenant resolution
  ↓
AI-ASSIST service authentication
  ↓
AI-ASSIST
```

Rules:
- Browser must never receive the service token.
- Browser-supplied tenant identity must not be authoritative.
- Do not route AI-ASSIST through a generic `/api/proxy/*`.
- Preserve tenant isolation; validate inbound and upstream payloads; map errors deliberately.
- Use idempotency for retryable mutations.
- Use TDD: write tests first, then implement.

### R4. Complete Exception Review UI

Information architecture: `Compliance → Audit Engine / Watchtower / Exception Review`.

Routes: `/dashboard/reviews`, `/dashboard/reviews/[briefId]`.

Required states: loading, empty, success, validation failure, 401, 403, 404, 409, 429, 503, 504/timeout.

- Reuse healthy existing dashboard primitives.
- Do not invent server state.
- Do not allow AI-generated advisory output to silently mutate source-of-record business decisions.
- Ensure sensitive compliance surfaces do not unnecessarily expose global/public ChatWidget behavior.

### R5. Reverify and fix historical frontend findings

Investigate before changing. Treat as hypotheses until proven:
- Role casing/inconsistency
- NextAuth vs fintech JWT boundary
- Hardcoded identities/location/date
- Production-looking secrets/defaults
- Orphan routes
- Mock/live data mixing
- Environment validation
- Compliance authorization
- Runtime mismatch
- Unsafe generic proxy assumptions

Fix verified P0/P1 issues only. Do not manufacture work.

### R6. Create the shared Agent OS

If not already correctly implemented, create persistent repository engineering instructions:

```
AGENTS.md                          (root — durable rules only)
.agents/skills/
├── recover-state/SKILL.md
├── current-docs/SKILL.md
├── tdd/SKILL.md
├── systematic-debug/SKILL.md
├── security-review/SKILL.md
├── release-gate/SKILL.md
└── checkpoint-handoff/SKILL.md
```

Skills use progressive disclosure, remain focused, and contain no temporary facts (those go in `CURRENT_STATE.md`).

### R7. Use current official documentation

Before implementing version-sensitive functionality, detect installed versions. Use current official docs (Next.js/React, Auth.js/NextAuth, Prisma, Node, Vercel, AI-ASSIST contract) — never invent config flags from model memory.

### R8. Verification — no self-certification

Run all applicable: targeted tests, adapter tests, RBAC/tenant tests, full test suite, typecheck, lint, build, credential/secret scan, `git diff --check`.

Security review for: tenant bypass, IDOR, service-token leakage, unsafe retries, PII leakage, auth confusion, CORS, injection, generic proxy misuse, unsafe defaults.

Then run an **independent Victory Audit** via the RELEASE_AUDITOR. The auditor must verify: git provenance, test integrity, absence of mocked verification, build, security, live service contract, frontend/backend compatibility. No completion claim based only on implementation-agent reports.

### R9. Release (only if all gates pass)

1. Create focused commits; push the feature branch; create/update PR.
2. Wait for CI; resolve failures.
3. Perform independent diff/security review.
4. Merge through the repository's documented process.
5. Deploy through existing approved production path.
6. Run live smoke/E2E tests.
7. Verify deployed version/commit identity.

Do NOT: force push, bypass failed CI, disable protections, expose credentials, or perform destructive migrations.

If a real external blocker prevents deployment, stop at `READY_TO_DEPLOY` with exact evidence.

### R10. Business / revenue check

Before optional polish, identify CUSTOMER IMPACT, REVENUE IMPACT, PRODUCTION IMPACT. Prioritize: security → working customer flow → demo/conversion path → reliable production behavior → cosmetic architecture.

---

## Acceptance Criteria

### Milestone 0 — State Recovery
- [ ] Git state recorded; every modified/untracked file classified.
- [ ] No Codex work destroyed.

### Milestone 1 — Team
- [ ] All 7 roles dispatched; write domains non-overlapping.

### Milestone 2 — Contract
- [ ] AI-ASSIST v1.1.0 contract read from actual source (not memory).
- [ ] All specified semantics verified; any mismatch marked `CONTRACT_MISMATCH`.

### Milestone 3 — Adapter
- [ ] Adapter routes through authenticated server boundary only.
- [ ] Service token never reachable by browser.
- [ ] Tenant identity derived from verified auth context, not request input.
- [ ] Tests written first (TDD); all adapter tests pass.

### Milestone 4 — Exception Review
- [ ] Both routes render all 10 required states.
- [ ] No invented server state; no silent AI mutation of business decisions.
- [ ] Existing dashboard primitives reused where applicable.

### Milestone 5 — Frontend Findings
- [ ] Each hypothesis investigated with evidence before any change.
- [ ] Only verified P0/P1 issues fixed.

### Milestone 6 — Agent OS
- [ ] `AGENTS.md` updated with durable rules.
- [ ] All 7 skills created with focused, progressive-disclosure content.

### Milestone 7 — Docs
- [ ] Installed versions detected before implementing version-sensitive code.

### Milestone 8 — Verification
- [ ] All tests pass; typecheck/lint/build clean; no credential leaks.
- [ ] Security review completed for all 10 attack surfaces.
- [ ] Independent Victory Audit completed by RELEASE_AUDITOR.

### Milestone 9 — Release
- [ ] PR created; CI passes; independent diff review done.
- [ ] Merge completed through documented process.
- [ ] Deployed; smoke/E2E tests pass; version/commit identity verified.
  OR: `READY_TO_DEPLOY` with exact blocker evidence.

### Milestone 10 — Business Check
- [ ] Customer/revenue/production impact assessed before any optional polish.

### Milestone 11 — Checkpoint
- [ ] `docs/engineering/CURRENT_STATE.md` updated.
- [ ] `docs/engineering/ANTIGRAVITY_LEDGER.md` created/updated.
- [ ] `docs/engineering/HANDOFF.md` updated.
- [ ] Compact handoff returned in required format.

---

## Handoff Format

Return only:

```
PROJECT
BRANCH
HEAD
UPSTREAM CONTRACT
COMPLETED
VERIFIED
TESTS
SECURITY
COMMITS
PR
CI
DEPLOYMENT
LIVE VERIFICATION
CUSTOMER IMPACT
REVENUE IMPACT
BLOCKERS
NEXT EXACT ACTION
DO NOT DO
```

## 2026-09-16T13:45:33Z

COMPUTE ROUTING — ADDENDUM (applies immediately)

Current Antigravity model capacity is uneven. Use available compute economically.

PRIMARY ORCHESTRATOR / WRITER:
Claude Sonnet

USE FAST/CHEAPER AVAILABLE MODELS FOR:
- repo exploration
- file discovery
- documentation lookup
- simple test analysis
- summarization

USE CLAUDE OPUS ONLY WHEN:
- architecture is genuinely ambiguous;
- a security/auth/tenant issue requires deeper adjudication;
- three disciplined implementation/debugging attempts fail;
- independent release review needs stronger reasoning.

OPERATING RULES:
- Do not spend high-cost reasoning on broad repository search.
- Parallelize read-heavy work.
- Serialize overlapping writes.
- Previous audit evidence is valid handoff evidence, but still perform targeted freshness checks before writing.
- Do NOT rerun expensive discovery that has no chance of changing the implementation decision.

Start from the first incomplete integration milestone. Skip completed milestones — do not re-verify what is already done unless a freshness check reveals a real conflict.

## 2026-09-17T15:24:03Z

Execute the complete ShadowSpark Commercial Conversion & Pilot Enablement Suite: automate multi-channel prospect outreach delivery and tracking for the 10 target Nigerian fintechs, build a self-service interactive demo sandbox with instant isolated trial tenant provisioning, and execute an automated red-team security verification under SEC Circular 26-1 controls.

Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production
Integrity mode: development

## Requirements

### R1. Commercial Outreach Delivery & Pipeline Automation
Implement an automated multi-channel dispatch, delivery tracking, and follow-up logging engine for the 10 qualified Nigerian fintech targets (FairMoney, Carbon, Renmoney, Branch, Kuda, PalmPay, Quidax, Busha, Yellow Card, Flitaa) based on `docs/OUTREACH_CAMPAIGN_BATCH_01.md`, recording real-time delivery telemetry and pilot scheduling without fake metrics in `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md`.

### R2. Self-Service Demo Sandbox & Instant Trial Tenant Provisioning
Build an interactive, low-friction self-service demo and pilot onboarding flow on the live application. Qualified compliance operators must be able to provision a cryptographically isolated trial tenant partition, explore pre-populated synthetic transaction exceptions, and complete the Exception Review co-pilot workflow with live AI-ASSIST advisory briefs in under 3 minutes.

### R3. SEC Circular 26-1 Red-Team Compliance & Security Stress-Testing
Implement an automated compliance stress-testing suite that red-teams the platform against adversarial inputs: prompt injections in transaction notes (LLM01:2026), cross-tenant leakage attempts, unauthorized IDOR brief retrieval, and tampering with audit trails, verifying that all decisions produce immutable, mathematically non-repudiable audit logs ready for CBN/SEC regulatory inspection.

### R4. Controlled Stack & Tenant Safeguards
All modifications must respect bounded write domains and production safeguards: preserve strict server-authoritative tenant isolation derived exclusively from verified authentication context, maintain exact monetary precision with Prisma Decimal, enforce fail-closed authorization, and never expose service credentials to client browsers.

## Verification Resources

- Existing automated test suite: `npm test` (39 test files, 276 Vitest tests)
- Security credential leak guard: `npm run test:secrets` (9/9 automated checks)
- Static type verification: `npm run typecheck`
- Live production demo test suite: `scripts/demo-verification-runbook.ts`
- Upstream AI-ASSIST contract and simulator: `tests/e2e/upstream-simulator.ts`

## Acceptance Criteria

### Commercial Conversion Engine
- [ ] Outreach delivery and response tracking mechanism operational for all 10 Batch 01 target institutions.
- [ ] Customer evidence telemetry in `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md` accurately tracks real prospect pipeline states without simulated data.

### Self-Service Onboarding & Demo Sandbox
- [ ] Trial tenant provisioning creates isolated `Tenant` and `TenantMembership` records in Neon PostgreSQL.
- [ ] The self-service demo environment renders all Exception Review states (`pending_review`, `annotated`, loading, error) and supports submitting annotations with live audit logging.
- [ ] Time-to-first-reviewed-exception takes under 3 minutes for a newly onboarded user.

### Compliance & Red-Team Security
- [ ] Zero cross-tenant data leakage under multi-tenant replay tests.
- [ ] Adversarial prompt injections in transaction notes are flagged without mutating source-of-record status.
- [ ] Credential leak scan (`npm run test:secrets`) passes with 0 leaks.
- [ ] Static type check (`npm run typecheck`), full test suite (`npm test`), and production build pass with zero errors.

## 2026-09-17T20:54:18Z

Finalize the full production and revenue gate for ShadowSpark Technologies: verify and integrate trial sandbox provisioning (M-R2), customer outreach pipeline (M-R1), SEC Circular 26-1 red-team compliance (M-R3), and execute full production builds and test verification across both worktrees.

Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production
Integrity mode: development

## Requirements

### R1. Trial Sandbox Provisioning & Onboarding (M-R2)
- Provide instant, isolated demo tenant provisioning with atomic PostgreSQL transactions.
- Seed synthetic loan exceptions using strict Prisma Decimal monetary precision.
- Seed upstream AI-ASSIST briefs in `pending_review` state for immediate trial access.
- Reject unauthenticated account linkage on email collision with HTTP 409 `EMAIL_ALREADY_EXISTS`.
- Log immutable audit trails in database on operator compliance actions.

### R2. Commercial Outreach & Telemetry Pipeline (M-R1)
- Automate multi-channel outreach dispatch for Batch 01 target institutions.
- Maintain webhook handlers for delivery and read status receipts with strict signature and mode verification.
- Prevent duplicate outreach dispatches through idempotent processing.

### R3. SEC Circular 26-1 Red-Team Compliance & Security (M-R3)
- Verify strict tenant isolation across all endpoints: zero cross-tenant data leakage or tenant override from untrusted parameters.
- Verify adversarial stress resilience under concurrent provisioning and high-volume compliance reviews.
- Maintain fail-closed authorization semantics on all compliance routes.

### R4. Production Verification & Dual-Worktree Stability (M-R4)
- Ensure all CPU-intensive security tests have adequate timeouts to prevent concurrency test flakes.
- Verify `npm run typecheck` (`tsc --noEmit`) passes with 0 errors across the codebase.
- Verify full test suite (`npm test` / `vitest run`) passes 100% across all 44 test suites.
- Verify `npm run test:secrets` passes 9/9 with zero high-confidence credential leaks.
- Verify `npm run build` succeeds cleanly for Netlify production deployment.

## Acceptance Criteria

### Automated Verification
- [ ] `npx prisma generate` succeeds and types are up-to-date.
- [ ] `npm run typecheck` exits with code 0 across the entire repository.
- [ ] `npm test` passes all 44 test suites (including sandbox, outreach, and challenger stress harnesses) without timeouts.
- [ ] `npm run test:secrets` reports 0 detected secrets or credentials.
- [ ] `npm run build` compiles all 80 application routes cleanly with 0 build errors.
- [ ] Forensic integrity audit verifies no dummy, mocked, or bypassed implementations.

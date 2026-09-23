# Execution Plan — ShadowSpark Commercial Conversion & Pilot Enablement Suite

## Objective
Execute all 4 requirements (R1-R4) from the 2026-09-17T15:24:03Z user directive with rigorous engineering discipline, bounded write domains, TDD, and multi-tier verification.

---

## Phase 0: Baseline Survey & Codebase Exploration
- **Goal**: Map existing assets, schemas, tests, and documentation relevant to R1-R4.
- **Actions**:
  - Dispatch parallel Explorers (`teamwork_preview_explorer`) to inspect:
    1. Outreach campaign definitions (`docs/OUTREACH_CAMPAIGN_BATCH_01.md`), pipeline docs (`docs/CUSTOMER_EVIDENCE.md`, `docs/FIRST_5_CUSTOMERS.md`), and any existing outreach/CRM scripts.
    2. Tenant provisioning architecture (`prisma/schema.prisma`, auth routes, tenant membership, demo/sandbox routes, Exception Review integration).
    3. Existing test suites, security test harnesses (`tests/`, `scripts/demo-verification-runbook.ts`, `tests/e2e/upstream-simulator.ts`), and SEC Circular 26-1 compliance requirements.
  - Synthesize explorer findings into `SCOPE.md`.

---

## Phase 1: Milestone R1 — Commercial Outreach Delivery & Pipeline Automation
- **Goal**: Multi-channel outreach delivery & tracking engine for the 10 Nigerian fintech targets.
- **Actions**:
  - Implement dispatch engine and telemetry tracking for:
    - FairMoney, Carbon, Renmoney, Branch, Kuda, PalmPay, Quidax, Busha, Yellow Card, Flitaa.
  - Update and synchronize `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md` with verifiable telemetry without fake/simulated numbers.
  - Write test harness verifying outreach dispatch, idempotency, and error handling.
  - Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.

---

## Phase 2: Milestone R2 — Self-Service Demo Sandbox & Instant Trial Tenant Provisioning
- **Goal**: Interactive self-service demo & onboarding flow with isolated trial tenant provisioning.
- **Actions**:
  - Implement self-service trial tenant provisioning creating isolated `Tenant` and `TenantMembership` in database.
  - Seed synthetic transaction exceptions for the trial tenant.
  - Wire Exception Review co-pilot workflow with live AI-ASSIST briefs supporting all states (`pending_review`, `annotated`, loading, error).
  - Ensure time-to-first-reviewed-exception is achievable in under 3 minutes.
  - Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.

---

## Phase 3: Milestone R3 — SEC Circular 26-1 Red-Team Compliance & Security Stress-Testing
- **Goal**: Automated red-team compliance and security stress-testing suite.
- **Actions**:
  - Implement automated red-team test suite:
    - Prompt injections in transaction notes (LLM01:2026) flagged without mutating source-of-record.
    - Multi-tenant replay tests confirming zero cross-tenant data leakage.
    - IDOR brief retrieval protection.
    - Audit trail tamper-resistance and non-repudiation.
  - Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.

---

## Phase 4: Milestone R4 & Comprehensive Verification
- **Goal**: Controlled stack & tenant safeguards verification and full regression pass.
- **Actions**:
  - Run full test suite: `npm test` (all test files pass).
  - Run secret leak scan: `npm run test:secrets` (0 leaks).
  - Run static type checking: `npm run typecheck` (0 errors).
  - Run production build.
  - Run red-team compliance tests.
  - Forensic Auditor independent verification.

---

## Phase 5: Handoff & Victory Claim
- **Goal**: Compile victory claim evidence and report to Sentinel.

# DISPATCH — TEST_ENGINEER (`teamwork_preview_test_writer_1`)

## Identity
- Role: TEST_ENGINEER
- Type: teamwork_preview_test_writer
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_test_writer_1
- Parent Orchestrator: orchestrator_2 (ea8ba151-74fe-469b-a4f6-8d6ec1c6ad53)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Design and implement the opaque-box E2E test suite (Milestone E2E-Tests):
1. **Requirements-Driven Opaque-Box Design**:
   - Derive test cases directly from `ORIGINAL_REQUEST.md` and `PROJECT.md` specifications (NOT implementation internals).
   - Test endpoints:
     - `POST /api/compliance/briefs`
     - `GET /api/compliance/reviews`
     - `GET /api/compliance/reviews/[briefId]`
     - `POST /api/compliance/reviews/[briefId]/annotations`
   - Test critical security & compliance properties:
     - Tenant isolation: requests with invalid or cross-tenant identities fail closed (HTTP 401/403).
     - Missing or invalid `Idempotency-Key` on mutating POST requests fails (HTTP 400).
     - Idempotent replays with same key return consistent results without duplicating side-effects.
     - Upstream error mapping: 400 maps to 400, 429 maps to 429, 503 maps to 503.
     - Passkey containment: `POST /api/auth/verify-login` returns fail-closed 503.
2. **Create `TEST_INFRA.md`** at repository root describing:
   - Test runner invocation (`fnm exec --using=24 npm run test:e2e` or Vitest command)
   - Methodology (Tiers 1-4)
   - Coverage thresholds
3. **Implement Test Files in `tests/e2e/`**:
   - `tests/e2e/compliance-flow.test.ts`: Happy path, listing, detail, annotation submission.
   - `tests/e2e/tenant-isolation.test.ts`: Multi-tenant boundary tests, tenant mismatch rejection, fail-closed auth.
   - `tests/e2e/idempotency.test.ts`: Idempotency key uniqueness, replay testing, header requirements.
   - `tests/e2e/error-states.test.ts`: 10-state response verification (400, 401, 403, 404, 409, 429, 503, 504).
4. **Publish `TEST_READY.md`** at repository root upon completion with summary table.

## Exclusive Write Ownership
You own and may modify ONLY these files:
- `tests/e2e/*`
- `TEST_INFRA.md`
- `TEST_READY.md`
DO NOT touch any `src/` source code files or `AGENTS.md`.

## Inputs
- MANDATORY: Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/handoff.md`

## Output Requirements
Write progress to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_test_writer_1/progress.md`.
Write full handoff report to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_test_writer_1/handoff.md`.
Send completion message to orchestrator_2 when finished.

## 2026-09-16T17:33:17Z - User Request
You are TEST_ENGINEER (teamwork_preview_test_writer).
Your working directory is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_test_writer_1
Your dispatch file is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_test_writer_1/DISPATCH.md
Your mission is to design and implement the opaque-box E2E test suite (Milestone E2E-Tests), create TEST_INFRA.md, write test cases in tests/e2e/*, and publish TEST_READY.md.
Read DISPATCH.md and ORIGINAL_REQUEST.md before starting work.
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
Write your progress to your progress.md and send your handoff report to orchestrator_2 via send_message.

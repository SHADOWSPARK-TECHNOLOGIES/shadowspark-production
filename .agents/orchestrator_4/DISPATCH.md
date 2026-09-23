# DISPATCH — Generation 4 Orchestrator

## Mission
Finalize the full production and revenue gate for ShadowSpark Technologies:
1. R1: Trial Sandbox Provisioning & Onboarding (M-R2)
   - Instant, isolated demo tenant provisioning with atomic PostgreSQL transactions.
   - Seed synthetic loan exceptions using strict Prisma Decimal monetary precision.
   - Seed upstream AI-ASSIST briefs in `pending_review` state for immediate trial access.
   - Reject unauthenticated account linkage on email collision with HTTP 409 `EMAIL_ALREADY_EXISTS`.
   - Log immutable audit trails in database on operator compliance actions.
2. R2: Commercial Outreach & Telemetry Pipeline (M-R1)
   - Automate multi-channel outreach dispatch for Batch 01 target institutions.
   - Maintain webhook handlers for delivery and read status receipts with strict signature and mode verification.
   - Prevent duplicate outreach dispatches through idempotent processing.
3. R3: SEC Circular 26-1 Red-Team Compliance & Security (M-R3)
   - Verify strict tenant isolation across all endpoints: zero cross-tenant data leakage or tenant override from untrusted parameters.
   - Verify adversarial stress resilience under concurrent provisioning and high-volume compliance reviews.
   - Maintain fail-closed authorization semantics on all compliance routes.
4. R4: Production Verification & Dual-Worktree Stability (M-R4)
   - Ensure all CPU-intensive security tests have adequate timeouts to prevent concurrency test flakes.
   - Verify `npx prisma generate` succeeds and types are up-to-date.
   - Verify `npm run typecheck` (`tsc --noEmit`) passes with 0 errors across the codebase.
   - Verify full test suite (`npm test` / `vitest run`) passes 100% across all 44 test suites.
   - Verify `npm run test:secrets` passes 9/9 with zero high-confidence credential leaks.
   - Verify `npm run build` succeeds cleanly for Netlify production deployment (all 80 routes compile cleanly).
   - Forensic integrity audit verifies no dummy, mocked, or bypassed implementations.

## Working Directory & Identity
- Working directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_4`
- Role: Project Orchestrator (Generation 4)
- Authoritative Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (see section `## 2026-09-17T20:54:18Z`)
- Project root: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production`
- Predecessor artifacts: Check `.agents/orchestrator_3/` for prior progress, gate status, and remediation items (specifically `src/app/actions/sandbox.ts` TS2339 and email collision handling, test timeout adjustments).

## Protocol & Requirements
- Maintain `progress.md` and `BRIEFING.md` in your working directory at all times. Update `progress.md` regularly with active milestones, completed actions, and next steps.
- Dispatch specialist subagents with non-overlapping write boundaries or manage remediation and verification directly.
- Adhere strictly to repository rules in `AGENTS.md`:
  - Multi-tenant isolation server-side only
  - Exact monetary precision with Prisma Decimal
  - Fail-closed security
  - Secret hygiene (`npm run test:secrets`)
  - No invented APIs or test results
- Execute full verification before claiming victory:
  - `npx prisma generate`
  - `npm run typecheck` (0 errors)
  - `npm test` (all 44 test suites pass)
  - `npm run test:secrets` (9/9 checks pass, 0 leaks)
  - `npm run build` (all 80 routes compile cleanly)
- When finished, submit your victory claim with complete verification output to Sentinel. Independent Victory Audit will be triggered.

## 2026-09-17T20:55:21Z
<USER_REQUEST>
You are the Generation 4 Project Orchestrator for ShadowSpark Technologies.
Your working directory is `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_4`.
Your dispatch briefing is at `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_4/DISPATCH.md`.
The authoritative user request is at `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (see section `## 2026-09-17T20:54:18Z`).
Prior generation artifacts are in `.agents/orchestrator_3/` (see `progress.md` and `GATE_STATUS.md`).

Execute and finalize the full production and revenue gate:
1. R1. Trial Sandbox Provisioning & Onboarding (M-R2)
   - Resolve TS2339 in `src/app/actions/sandbox.ts` and handle email collisions with HTTP 409 `EMAIL_ALREADY_EXISTS`.
   - Ensure instant, isolated demo tenant provisioning with atomic PostgreSQL transactions.
   - Seed synthetic loan exceptions with Prisma Decimal monetary precision and upstream AI-ASSIST briefs in `pending_review` state.
   - Verify immutable audit trail logging on operator actions.
2. R2. Commercial Outreach & Telemetry Pipeline (M-R1)
   - Multi-channel outreach dispatch for Batch 01 target institutions.
   - Webhook handlers for delivery/read receipts with signature and mode verification.
   - Idempotent processing preventing duplicates.
3. R3. SEC Circular 26-1 Red-Team Compliance & Security (M-R3)
   - Strict tenant isolation across all endpoints.
   - Adversarial stress resilience under concurrent provisioning and high-volume reviews.
   - Fail-closed authorization semantics on all compliance routes.
4. R4. Production Verification & Dual-Worktree Stability (M-R4)
   - Ensure CPU-intensive security tests have adequate timeouts to avoid test flakes.
   - Verify `npx prisma generate` succeeds.
   - Verify `npm run typecheck` passes with 0 errors across entire codebase.
   - Verify `npm test` passes all 44 test suites 100%.
   - Verify `npm run test:secrets` passes 9/9 with 0 leaks.
   - Verify `npm run build` succeeds cleanly for Netlify production deployment (all 80 application routes).
   - Ensure forensic integrity: no dummy, mocked, or bypassed implementations.

Maintain `progress.md` and `BRIEFING.md` in your working directory.
When complete, send your victory claim with all command verification outputs to the Sentinel.
</USER_REQUEST>

# DISPATCH — Worker Sandbox (Generation 4 Remediation)

## Mission
Remediate the M-R2 defects and M-R4 test stability requirements:
1. Fix TS2339 compile error in `src/app/actions/sandbox.ts:115` by adding `tenantId: string;` to `ProvisionTrialTenantOutput['loans']`.
2. Fix unauthenticated account association when email already exists in `src/app/actions/sandbox.ts:168-183` (reject with HTTP 409 `EMAIL_ALREADY_EXISTS`).
3. Ensure `src/app/api/sandbox/provision/route.ts` maps this collision to HTTP 409 with code `EMAIL_ALREADY_EXISTS`.
4. Update `tests/sandbox-provisioning.test.ts` to test this 409 conflict behavior and verify `loan.tenantId`.
5. Ensure CPU-intensive security/concurrency tests (`tests/challenger-concurrency.test.ts`, `tests/security/red-team-compliance.test.ts`, `tests/sandbox-provisioning.test.ts`) have adequate timeouts (e.g. 30s-60s) to prevent test flakes during parallel/heavy execution.
6. Verify:
   - `npx prisma generate`
   - `npm run typecheck` (`tsc --noEmit`) passes with 0 errors across the entire repository.
   - `npm test` passes 100% across all 44 test suites.
   - `npm run test:secrets` passes 9/9 with 0 leaks.
   - `npm run build` succeeds cleanly.

## Inputs & Context
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T20:54:18Z)
- Scope: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_4/SCOPE.md`
- Reviewer Commercial Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_reviewer_commercial_1/handoff.md`
- Reviewer Security Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_reviewer_security_1/handoff.md`
- Challenger 1 Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_challenger_1/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4`
- Parent Conversation ID: `3e5fa29a-3849-4505-b8e1-013ab64a4a70`

## Bounded Write Ownership
You own and may modify ONLY:
- `src/app/actions/sandbox.ts`
- `src/app/api/sandbox/provision/route.ts`
- `tests/sandbox-provisioning.test.ts`
- `tests/challenger-concurrency.test.ts` (timeouts only if needed)
- `tests/security/red-team-compliance.test.ts` (timeouts only if needed)
- Metadata files inside your working directory (`.agents/worker_sandbox_4/`)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-17T20:56:52Z
You are Worker Sandbox for ShadowSpark Technologies (Generation 4).
Your working directory is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4
Your dispatch assignment is in: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4/DISPATCH.md
Read the authoritative user request at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (see section ## 2026-09-17T20:54:18Z).
Read your DISPATCH.md before touching any code.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your tasks:
1. In src/app/actions/sandbox.ts:115, add tenantId: string; to ProvisionTrialTenantOutput['loans'].
2. In src/app/actions/sandbox.ts:168-183, fix unauthenticated user account association:
   - When checking for an existing user with operatorEmail: if a user already exists with that email, reject the request with HTTP 409 Conflict (throw or return { ok: false, error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists. Please sign in or use a different email address.' } }). Do NOT silently attach an unauthenticated existing account to the trial tenant!
   - In src/app/api/sandbox/provision/route.ts, handle this collision cleanly and return HTTP 409 with { error: 'EMAIL_ALREADY_EXISTS', message: '...' }.
3. In tests/sandbox-provisioning.test.ts, ensure tests pass with loan.tenantId, and add/update test cases verifying that supplying an existing user's email returns HTTP 409 EMAIL_ALREADY_EXISTS.
4. Check test timeouts on CPU-intensive security and concurrency tests (tests/challenger-concurrency.test.ts, tests/security/red-team-compliance.test.ts, tests/sandbox-provisioning.test.ts) and ensure tests have adequate timeouts (e.g. 30,000ms - 60,000ms) to avoid test flakes.
5. Execute verification commands:
   - npx prisma generate
   - npm run typecheck (tsc --noEmit) - must exit with 0 errors!
   - npx vitest run tests/sandbox-provisioning.test.ts
   - npm test - must pass all 44 test files 100%!
   - npm run test:secrets - must pass 9/9 with 0 leaks!
   - npm run build - Next.js production build must succeed cleanly!
6. Document all changes and verbatim verification outputs in handoff.md in your working directory (/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4/handoff.md), and send a message back to parent when complete.

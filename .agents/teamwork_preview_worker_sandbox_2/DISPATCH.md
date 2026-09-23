# DISPATCH — Worker Sandbox (Remediation Iteration 2)

## Mission
Remediate the two defects identified by Reviewers and Challengers in `src/app/actions/sandbox.ts`:
1. Fix TS2339 compile error in `ProvisionTrialTenantOutput['loans']` by adding `tenantId: string;`
2. Secure unauthenticated existing user association in `provisionTrialTenantCore`
3. Verify `npm run typecheck` passes with zero errors!

## Inputs & Context
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T15:24:03Z)
- Master Scope: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_3/SCOPE.md`
- Gate Status: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_3/GATE_STATUS.md`
- Reviewer Commercial Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_reviewer_commercial_1/handoff.md`
- Reviewer Security Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_reviewer_security_1/handoff.md`
- Challenger 1 Report: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_challenger_1/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_2`
- Parent Conversation ID: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`

## Bounded Write Ownership
You are STRICTLY CONFINED to writing and modifying ONLY these files:
- `src/app/actions/sandbox.ts`
- `src/app/api/sandbox/provision/route.ts`
- `tests/sandbox-provisioning.test.ts`
- Metadata files inside your working directory (`.agents/teamwork_preview_worker_sandbox_2/`)

DO NOT touch any file outside this bounded domain.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. **Fix Interface Typing in `src/app/actions/sandbox.ts:115`**:
   Add `tenantId: string;` to the `loans` array element type in `ProvisionTrialTenantOutput`:
   ```typescript
   loans: Array<{
     id: string;
     tenantId: string;
     applicantName: string;
     loanAmount: Prisma.Decimal;
     status: string;
   }>;
   ```
2. **Fix Unauthenticated Existing User Linkage (`src/app/actions/sandbox.ts:168-183`)**:
   In `provisionTrialTenantCore`:
   When checking for existing user by email:
   If an existing user is found, DO NOT silently attach a `TenantMembership` with role `COMPLIANCE` without authentication!
   Instead:
   If the user already exists, reject trial provisioning with HTTP 409 Conflict (or throw a structured error `{ ok: false, error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists. Please sign in or use a different email address." } }`).
   Ensure `tests/sandbox-provisioning.test.ts` and `src/app/api/sandbox/provision/route.ts` map this 409 error cleanly.
3. **Verification**:
   - Run `npm run typecheck` (`tsc --noEmit`). It MUST pass with exit code 0 and ZERO errors across the entire repository!
   - Run `npx vitest run tests/sandbox-provisioning.test.ts` to ensure all tests pass (update any test if needed for the 409 collision behavior).
   - Run `npm test` (all test files pass).
   - Run `npm run test:secrets` (9/9 pass, 0 leaks).
   - Run `npm run build` (Next.js build succeeds).
4. Write comprehensive `handoff.md` and send message to parent upon completion.

## 2026-09-17T15:51:19Z
<USER_REQUEST>
You are Worker Sandbox (Generation 2) for Milestone M-R2 remediation. Your working directory is:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_2
Your task is defined in:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_2/DISPATCH.md
Read ORIGINAL_REQUEST.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (§ 2026-09-17T15:24:03Z).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Follow your DISPATCH.md to:
1. Add `tenantId: string;` to `ProvisionTrialTenantOutput['loans']` in `src/app/actions/sandbox.ts:115`.
2. Fix unauthenticated account association when email already exists in `src/app/actions/sandbox.ts:168-183` (reject with 409 EMAIL_ALREADY_EXISTS).
3. Verify that `npm run typecheck` passes with zero errors across the entire codebase!
4. Verify `npm test`, `npm run test:secrets`, and `npm run build`.
Write your handoff.md and send a message back upon completion.
</USER_REQUEST>

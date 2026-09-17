# DISPATCH — ADAPTER_ENGINEER (`teamwork_preview_worker_adapter_3`)

## Identity
- Role: ADAPTER_ENGINEER
- Type: teamwork_preview_worker
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_3
- Parent Orchestrator: orchestrator_2 (ea8ba151-74fe-469b-a4f6-8d6ec1c6ad53)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Finalize, verify, and test Milestone 3 (R3) Production-Safe Server Adapter:
1. Inspect the implementation done by `worker_adapter_2`:
   - `src/lib/ai-assist/types.ts`
   - `src/lib/ai-assist/errors.ts` (mapped HTTP 400 to `{ status: 400, code: "INVALID_BODY" }`)
   - `src/lib/ai-assist/client.ts` (`listComplianceReviews`, `getComplianceReview`, `addComplianceAnnotation`, `createComplianceBrief`)
   - `src/lib/ai-assist/server-auth.ts` (`resolveComplianceAuth`)
   - `src/app/api/compliance/reviews/route.ts`
   - `src/app/api/compliance/briefs/route.ts`
   - `src/app/api/compliance/reviews/[briefId]/route.ts`
   - `src/app/api/compliance/reviews/[briefId]/annotations/route.ts`
   - `src/lib/config/validateEnv.ts` (includes `JWT_SECRET`)
   - `tests/auth-credentials.test.ts` (fixed TypeScript cast)
2. Expand and verify test suites:
   - `tests/ai-assist-client.test.ts`: Verify tests cover `listComplianceReviews` (including query parameters, headers, pagination, upstream 400 mapping, upstream 503/timeout).
   - `tests/api/compliance.test.ts`: Verify line 256 includes `"reviews/route.ts"`, and tests cover `GET /api/compliance/reviews` with auth (both NextAuth session with tenant lookup and Bearer JWT), unauthorized 401/403, and query validation.
3. Execute verification commands using Node 24:
   - `fnm exec --using=24 npx vitest run tests/ai-assist-client.test.ts tests/api/compliance.test.ts tests/auth-credentials.test.ts tests/passkey-login.test.ts`
   - `fnm exec --using=24 npm run typecheck`
   - `fnm exec --using=24 npm run test:secrets`
4. Document all results and command outputs in `handoff.md`.

## Exclusive Write Ownership
You own and may modify ONLY these files:
- `src/lib/ai-assist/*`
- `src/app/api/compliance/*`
- `src/lib/config/validateEnv.ts`
- `tests/ai-assist-client.test.ts`
- `tests/api/compliance.test.ts`
- `tests/auth-credentials.test.ts`
DO NOT touch any frontend dashboard UI files or AGENTS.md.

## Inputs
- MANDATORY: Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_2/progress.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/handoff.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1/handoff.md`

## Output Requirements
Write progress to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_3/progress.md`.
Write full handoff report with verification commands to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_3/handoff.md`.

## 2026-09-16T17:28:36Z
You are ADAPTER_ENGINEER (teamwork_preview_worker).
Your working directory is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_3
Your dispatch file is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_3/DISPATCH.md
Your mission is to finalize, verify, and test Milestone 3 (R3) Production-Safe Server Adapter.
Read DISPATCH.md and ORIGINAL_REQUEST.md before starting work.
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
Write your progress to your progress.md and send your handoff report to orchestrator_2 via send_message.

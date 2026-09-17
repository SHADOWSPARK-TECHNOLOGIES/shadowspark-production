# DISPATCH — ADAPTER_ENGINEER (`teamwork_preview_worker_adapter_2`)

## Identity
- Role: ADAPTER_ENGINEER (Replacement Gen 2)
- Type: teamwork_preview_worker
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_2
- Parent Orchestrator: orchestrator_1

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 3 (R3) Production-Safe Server Adapter and resolve audited contract mismatches and typing defects:
1. **Upstream Types Sharpening (`src/lib/ai-assist/types.ts`)**:
   - Add interfaces:
     - `ReviewQueueSummary`: `{ brief_id: string; tenant_id: string; exception_id: string; queue_state: "pending_review" | "annotated"; sor_status_unchanged: boolean; created_at: string; updated_at: string; }`
     - `ReviewQueueListResponse`: `{ items: ReviewQueueSummary[]; total: number; limit: number; offset: number; }`
     - `ListReviewsParams`: `{ limit?: number; offset?: number; state?: "pending_review" | "annotated"; }`
   - Sharpen `ReviewQueueResponse`: `brief_id: string; tenant_id: string; exception_id: string; output: unknown; queue_state: "pending_review" | "annotated"; sor_status_unchanged: boolean; annotations: Array<{ annotation_id: string; operator_id: string; annotation: string; created_at: string }>; created_at: string; updated_at: string;`
   - Sharpen `AddAnnotationParams`: `briefId: string; annotation: string; idempotencyKey?: string;`
2. **Error Status Mapping Fix (`src/lib/ai-assist/errors.ts`)**:
   - Fix `mapUpstreamStatus`: If upstream status is 400, return `{ status: 400, code: "INVALID_BODY" }` (do NOT map to 502).
3. **Review Queue List Client Function (`src/lib/ai-assist/client.ts`)**:
   - Implement `export async function listComplianceReviews(params: ListReviewsParams = {}): Promise<ReviewQueueListResponse>`.
   - Calls `GET /v1/review-queue?limit=...&offset=...&state=...`.
4. **Compliance API Routes (`src/app/api/compliance/`)**:
   - Create `src/app/api/compliance/reviews/route.ts` implementing `GET` to list review queue items with query parameter validation (`limit`, `offset`, `state`).
   - Server Auth Boundary Bridge across all compliance routes (`briefs/route.ts`, `reviews/route.ts`, `reviews/[briefId]/route.ts`, `reviews/[briefId]/annotations/route.ts`):
     - Check `requireAuthContext(request)` (Bearer JWT) OR NextAuth session via `auth()`.
     - When using NextAuth session: derive `userId = session.user.id`, lookup `prisma.tenantMembership.findFirst({ where: { userId } })` to obtain authoritative `tenantId`. If not found or unauthorized role, fail closed with HTTP 403 Forbidden.
     - Never allow browser request to dictate authoritative `tenantId`.
5. **Environment Validation (`src/lib/config/validateEnv.ts`)**:
   - Add `JWT_SECRET` to mandatory required env vars.
6. **Typecheck Cast Fix (`tests/auth-credentials.test.ts:17`)**:
   - Fix TypeScript cast: `as unknown as CredentialsConfig<...>`.
7. **TDD & Test Expansion**:
   - Update `tests/api/compliance.test.ts` line 256 to include `"reviews/route.ts"`.
   - Add unit tests for `listComplianceReviews` in `tests/ai-assist-client.test.ts`.
   - Add route integration tests for `GET /api/compliance/reviews` in `tests/api/compliance.test.ts`.
   - Ensure all tests pass: `fnm exec --using=24 npm test` and `fnm exec --using=24 npm run typecheck`.

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
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/handoff.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1/handoff.md`

## Output Requirements
Write progress to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_2/progress.md`.
Write full handoff report with verification commands to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_adapter_2/handoff.md`.
Send completion message to orchestrator_1 when finished.

# DISPATCH — FRONTEND_REVIEW_ENGINEER (`teamwork_preview_worker_frontend_1`)

## Identity
- Role: FRONTEND_REVIEW_ENGINEER
- Type: teamwork_preview_worker
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_frontend_1
- Parent Orchestrator: orchestrator_2 (ea8ba151-74fe-469b-a4f6-8d6ec1c6ad53)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 4 (Exception Review UI) and Milestone 5 (Frontend Findings):

1. **Navigation Registration (`src/lib/dashboard/navigation.ts`)**:
   - Register `{ label: 'Exception Review', href: '/dashboard/reviews', icon: ClipboardCheck, section: 'Compliance' }` in `NAV_ITEMS`.

2. **Exception Review Queue Page (`src/app/dashboard/reviews/page.tsx`)**:
   - Next.js client/server component displaying the review queue list.
   - Consumes `GET /api/compliance/reviews?state=...&limit=...&offset=...`.
   - Reuses healthy primitives: `DataTable`, `EmptyState`, `Skeleton`, `Badge`/`StatusBadge`.
   - Supports 10 states: loading, empty, success, validation error, 401, 403, 404, 409, 429, 503/504.

3. **Exception Review Detail Page (`src/app/dashboard/reviews/[briefId]/page.tsx`)**:
   - Displays brief details, exception information, raw upstream advisory output, and the immutable annotation trail.
   - Operator annotation submission via `POST /api/compliance/reviews/[briefId]/annotations` with `Idempotency-Key`.
   - Strict adherence: AI output is strictly advisory; no silent AI mutation of business decisions.
   - Supports 10 states: loading, empty, success, validation error (e.g. annotation length / invalid payload), 401, 403, 404, 409 (conflict), 429 (rate limited), 503/504 (timeout / unavailable).

4. **ChatWidget Containment (`src/components/ChatWidget.tsx`)**:
   - Use Next.js `usePathname()` to hide `<ChatWidget />` on `/dashboard/*`, `/admin/*`, and `/operator/*` routes so sensitive compliance surfaces do not expose public chat functionality.

5. **Frontend Survey Fixes (M5)**:
   - `src/app/dashboard/layout.tsx`: Replace hardcoded `"Stephen"` and `"ARCHITECT"` with dynamic user session information. Replace hardcoded `"Friday, 1 May 2026 · Owerri, NG"` with current dynamic date display.
   - `src/app/dashboard/PageClient.tsx`: Restore the command centre dashboard implementation from commit `8780a9c` (or equivalent rich implementation) replacing the stub `<div>...</div>`.
   - Remove orphan `.bak` files: `src/app/(marketing)/page.tsx.sovereign.bak`, `src/app/page.tsx.legacy.bak`, `src/app/api/assistant/route.ts.bak`.

6. **Verification**:
   - Verify typecheck: `fnm exec --using=24 npm run typecheck`.
   - Verify build: `fnm exec --using=24 npm run build`.
   - Run Vitest tests: `fnm exec --using=24 npm test`.

## Exclusive Write Ownership
You own and may modify ONLY these files:
- `src/app/dashboard/reviews/*`
- `src/lib/dashboard/navigation.ts`
- `src/app/dashboard/PageClient.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/ChatWidget.tsx`
- `src/app/(marketing)/page.tsx.sovereign.bak` (delete)
- `src/app/page.tsx.legacy.bak` (delete)
- `src/app/api/assistant/route.ts.bak` (delete)
- `tests/dashboard-reviews.test.ts` (if adding frontend review unit tests)
DO NOT touch any `src/lib/ai-assist/*`, `src/app/api/compliance/*`, or `AGENTS.md`.

## Inputs
- MANDATORY: Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md`
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1/handoff.md`

## Output Requirements
Write progress to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_frontend_1/progress.md`.
Write full handoff report with verification commands to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_frontend_1/handoff.md`.
Send completion message to orchestrator_2 when finished.

## 2026-09-16T17:28:36Z
You are FRONTEND_REVIEW_ENGINEER (teamwork_preview_worker).
Your working directory is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_frontend_1
Your dispatch file is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_frontend_1/DISPATCH.md
Your mission is to implement Milestone 4 (Exception Review UI) and Milestone 5 (Frontend Findings).
Read DISPATCH.md and ORIGINAL_REQUEST.md before starting work.
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
Write your progress to your progress.md and send your handoff report to orchestrator_2 via send_message.

## 2026-09-16T18:10:30Z
From: orchestrator_2 (2cf0dd6f-9bf8-4633-b7da-afc9acb804e7)
**Context**: Next.js App Router PageProps typecheck in reviews pages
**Content**: Note that Next.js App Router strictly checks default page export props in `.next/types`. If `src/app/dashboard/reviews/page.tsx` or `src/app/dashboard/reviews/[briefId]/page.tsx` export default page functions with custom props like `simulatedState` or `initialFilter`, `tsc --noEmit` will fail typecheck. Keep custom props optional or handle simulated states via searchParams (or in client child components) so `npm run typecheck` passes cleanly.
**Action**: Please ensure page component signatures comply with Next.js App Router PageProps and verify `fnm exec --using=24 npm run typecheck` exits with 0 errors.



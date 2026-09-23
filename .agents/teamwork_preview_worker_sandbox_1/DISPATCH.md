# DISPATCH — Worker Sandbox (Milestone M-R2)

## Mission
Implement Milestone M-R2: Self-Service Demo Sandbox & Instant Trial Tenant Provisioning.

## Inputs & Context
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T15:24:03Z)
- Master Scope: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_3/SCOPE.md`
- Survey Findings & Handoff: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_1`
- Parent Conversation ID: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`

## Bounded Write Ownership
You are STRICTLY CONFINED to writing and modifying ONLY these files:
- `src/app/actions/sandbox.ts` (create)
- `src/app/api/sandbox/provision/route.ts` (create)
- `src/app/(marketing)/sandbox/page.tsx` (create or enhance)
- `src/app/api/compliance/reviews/[briefId]/annotations/route.ts` (update for audit logging)
- `tests/sandbox-provisioning.test.ts` (create)
- Metadata files inside your working directory (`.agents/teamwork_preview_worker_sandbox_1/`)

DO NOT touch any file outside this bounded domain.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. **Instant Trial Tenant Provisioning Engine (`src/app/actions/sandbox.ts` and `src/app/api/sandbox/provision/route.ts`)**:
   - Create provisioning function using `prisma.$transaction`:
     - Creates isolated `Tenant` (`name: trial-${slug}-${random}`, `companyName`)
     - Creates or finds `User` with `role: "COMPLIANCE"`
     - Creates `TenantMembership` (`tenantId: tenant.id`, `userId: user.id`, `role: "COMPLIANCE"`)
     - Seeds 3 synthetic `LoanApplication` exceptions using exact `new Prisma.Decimal(...)` amounts (e.g. ₦350,000.00, ₦1,250,000.00, ₦850,000.00)
     - Emits initial provisioning `AuditLog`
   - Immediately calls upstream `createComplianceBrief` for each synthetic exception so the review queue at `/dashboard/reviews` is pre-populated with active briefs.
2. **Audit Logging on Annotation Submission (`src/app/api/compliance/reviews/[briefId]/annotations/route.ts`)**:
   - Ensure that after upstream `addComplianceAnnotation` succeeds, an immutable record is inserted into `prisma.auditLog` with `action: "COMPLIANCE_ANNOTATION_SUBMITTED"`, `tenantId`, `actorId`, `briefId`, and metadata.
3. **Interactive Sandbox UI (`src/app/(marketing)/sandbox/page.tsx`)**:
   - Provide a 1-click trial launcher with quick-select options for the 10 Batch 01 Nigerian institutions (FairMoney, Carbon, Renmoney, etc.).
   - Include progress indicator showing Neon partition creation, synthetic exception generation, and AI brief synthesis.
   - Redirect to `/dashboard/reviews` with guided co-pilot banner enabling < 3 min time-to-first-reviewed-exception.
4. **Automated Unit & Integration Tests (`tests/sandbox-provisioning.test.ts`)**:
   - Test trial tenant creation, membership role authorization, Prisma Decimal precision, upstream brief seeding, and annotation audit logging.
5. **Verification**:
   - Run `npx vitest run tests/sandbox-provisioning.test.ts`
   - Run `npm test`
   - Run `npm run test:secrets`
   - Run `npm run typecheck`
6. Write comprehensive `handoff.md` and send message to parent upon completion.

## 2026-09-17T15:33:18Z
You are Worker Sandbox for Milestone M-R2. Your working directory is:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_1
Your task is defined in:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_sandbox_1/DISPATCH.md
Read ORIGINAL_REQUEST.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (§ 2026-09-17T15:24:03Z).
Read your DISPATCH.md and the survey handoff at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Respect your bounded write ownership strictly. Implement trial tenant provisioning in Neon PostgreSQL, seeding 3 synthetic loan exceptions with Prisma Decimal, upstream brief creation, annotation audit logging in Neon, the interactive sandbox UI, and tests. Run verification commands and write your handoff.md, then send a message back.

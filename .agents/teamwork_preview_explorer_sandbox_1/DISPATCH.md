# DISPATCH — Explorer Sandbox & Onboarding (Survey R2 & R4)

## Mission
Survey the repository for Requirement R2: Self-Service Demo Sandbox & Instant Trial Tenant Provisioning, and R4: Controlled Stack & Tenant Safeguards.

## Context & Inputs
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (specifically section `## 2026-09-17T15:24:03Z`)
- Database schema: `prisma/schema.prisma`
- Existing Exception Review UI: `src/app/dashboard/reviews/*`
- Compliance routes: `src/app/api/compliance/*`
- Working directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1`
- Parent conversation ID: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`

## Specific Tasks
1. Read `ORIGINAL_REQUEST.md` (§ 2026-09-17T15:24:03Z).
2. Examine `prisma/schema.prisma` to see the structure of `Tenant`, `TenantMembership`, `User`, transactions, compliance reviews, briefs, annotations, audit logs.
3. Check existing demo / onboarding routes, scripts, or components (e.g., `src/app/demo/*`, `src/app/onboarding/*`, `scripts/demo-verification-runbook.ts`, `src/lib/demo/*`).
4. Inspect `src/app/dashboard/reviews/*` and `src/app/api/compliance/*` to verify current state of Exception Review UI and backend API.
5. Determine how trial tenant provisioning can be executed cleanly in Neon PostgreSQL (isolated `Tenant` + `TenantMembership`, synthetic transaction exceptions seeded, role assignment).
6. Assess how a newly onboarded compliance operator can complete the Exception Review co-pilot workflow (view brief, inspect exception, submit annotation) in under 3 minutes.
7. Verify all R4 safeguards: server-authoritative tenant isolation derived from verified auth context, Prisma Decimal exact precision, fail-closed auth, no browser exposure of service tokens.
8. Provide concrete architectural and implementation recommendations for Milestone R2.
9. Write `progress.md` and comprehensive `handoff.md` with full findings.
10. Send message back to parent upon completion.

## 2026-09-17T15:26:25Z
You are the Sandbox & Onboarding Survey Explorer. Your working directory is:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1
Your task is defined in:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1/DISPATCH.md
Read ORIGINAL_REQUEST.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (specifically § 2026-09-17T15:24:03Z).
Investigate prisma/schema.prisma, existing demo/trial routes, Exception Review UI at src/app/dashboard/reviews/*, and compliance API at src/app/api/compliance/*.
Determine requirements for instant trial tenant provisioning in Neon PostgreSQL, seeding synthetic exceptions, achieving < 3 min time-to-first-reviewed-exception, and enforcing R4 safeguards.
Write your analysis to progress.md and handoff.md in your working directory, then send a completion message to your parent.


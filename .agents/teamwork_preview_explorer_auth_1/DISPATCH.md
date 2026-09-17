# DISPATCH — AUTH_TENANT_SECURITY & Frontend Explorer

## Identity
- Role: AUTH_TENANT_SECURITY & Frontend Explorer
- Type: teamwork_preview_explorer
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1
- Parent Orchestrator: orchestrator_1

## Objective
Investigate authentication, tenancy, RBAC, security boundaries, and historical frontend hypotheses (Milestone 3, 4, 5 preparation):
1. Investigate NextAuth / auth boundary in `src/`:
   - Session handling, token parsing, user/session validation
   - Tenant resolution: how tenant is derived (session/membership vs request params/headers)
   - RBAC roles and permissions (role casing, schema enums, NextAuth vs fintech JWT boundaries)
   - Service authentication: where `AI_ASSIST_API_KEY` or service tokens are stored and used
2. Investigate Exception Review UI & routes:
   - Existing routes under `/dashboard/reviews`, `/dashboard/reviews/[briefId]` or compliance pages
   - Compliance navigation and layout (`Audit Engine`, `Watchtower`, `Exception Review`)
   - Existing components, design system primitives, error boundaries, state handling (loading, empty, success, 401, 403, 404, 409, 429, 503, 504)
   - ChatWidget presence on compliance pages (check if sensitive surfaces expose global ChatWidget)
3. Investigate historical frontend hypotheses listed in R5:
   - Role casing/inconsistency
   - NextAuth vs fintech JWT boundary
   - Hardcoded identities/location/date
   - Production-looking secrets/defaults
   - Orphan routes
   - Mock/live data mixing
   - Environment validation
   - Compliance authorization
   - Runtime mismatch
   - Unsafe generic proxy assumptions
   Record exact file locations and line numbers for confirmed vs disproven hypotheses.

## Scope Boundaries
- DO NOT modify any repository files.
- READ-ONLY investigation.

## Inputs
- ORIGINAL_REQUEST.md: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (MANDATORY: read this first).
- Repository Root: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production`

## Output Requirements
Write findings report to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1/handoff.md`.
Write progress updates to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1/progress.md`.
Send a completion message back to orchestrator_1 when finished.

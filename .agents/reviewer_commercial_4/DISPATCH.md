# DISPATCH — Reviewer Commercial (Generation 4)

## Mission
Independently review Milestones M-R1 (Commercial Outreach Delivery & Telemetry) and M-R2 (Trial Sandbox Provisioning & Onboarding):
1. Verify TS2339 resolution: `tenantId: string;` in `ProvisionTrialTenantOutput['loans']` in `src/app/actions/sandbox.ts`.
2. Verify unauthenticated account collision handling: HTTP 409 `EMAIL_ALREADY_EXISTS` in `src/app/actions/sandbox.ts` and `src/app/api/sandbox/provision/route.ts`.
3. Verify outreach pipeline, prospect seeding, WhatsApp webhook handling, and zero fake metrics in `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md`.
4. Run:
   - `npm run typecheck` (`tsc --noEmit`) — verify 0 errors.
   - `npx vitest run tests/sandbox-provisioning.test.ts tests/outreach-pipeline.test.ts`
   - `npm run test:secrets`
5. Write your comprehensive `handoff.md` with explicit verdict `APPROVE` or `REQUEST_CHANGES` and send a message back.

## Context & Inputs
- Authoritative Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T20:54:18Z)
- Worker Sandbox Handoff: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/reviewer_commercial_4`
- Parent Conversation ID: `3e5fa29a-3849-4505-b8e1-013ab64a4a70`

## Constraints
Review-only. Do NOT modify source code or tests. Write only to your working directory.

## 2026-09-17T21:04:54Z
You are Reviewer Commercial for ShadowSpark Technologies (Generation 4).
Your working directory is: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/reviewer_commercial_4
Your dispatch assignment is in: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/reviewer_commercial_4/DISPATCH.md
Read the authoritative request at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (§ 2026-09-17T20:54:18Z).
Read Worker Sandbox handoff at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/worker_sandbox_4/handoff.md.

Review M-R1 and M-R2:
1. Verify TS2339 resolution (tenantId added to ProvisionTrialTenantOutput['loans']).
2. Verify HTTP 409 EMAIL_ALREADY_EXISTS on existing operator email collisions in src/app/actions/sandbox.ts and src/app/api/sandbox/provision/route.ts.
3. Verify outreach pipeline, WhatsApp webhooks, and customer evidence synchronization.
4. Execute:
   - npm run typecheck (tsc --noEmit)
   - npx vitest run tests/sandbox-provisioning.test.ts tests/outreach-pipeline.test.ts
   - npm run test:secrets
5. Write your comprehensive handoff.md with explicit verdict APPROVE or REQUEST_CHANGES and send a message back.


## 2026-09-18T12:00:00Z

You are teamwork_preview_worker for shadowspark-production.
Your working directory is: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_worker_1
The user request is in: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/ORIGINAL_REQUEST.md. You MUST read this file first.
Review repository rules in: /home/moronto/AgentOps/worktrees/shadowspark-agy/AGENTS.md.
Also review the ponytail skill in: /home/moronto/.gemini/config/plugins/ponytail/skills/ponytail/SKILL.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context: 5 discovery tracks have audited the codebase and delivered verified handoff reports:
- Security Report: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_explorer_track_a_2/handoff.md
- Product & Payment Fallback Report: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_explorer_track_b_2/handoff.md
- Observability Report: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_explorer_track_c/handoff.md
- E2E Customer Journey Report: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_explorer_track_d/handoff.md
- Commercial & Fallback Specs: /home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_spec_miner_track_e/handoff.md

Your mission:
Implement all P0 Security findings and P1 Customer/Reliability/Revenue Blockers under strict Ponytail discipline (minimal change, reuse existing, stdlib/platform-native/installed deps before new, MINIMUM IMPLEMENTATION != MINIMUM VERIFICATION).

Scope of Work:

1. Security Hardening (P0/P1):
   - In `src/app/api/threads/publish/route.ts`: Require admin session via `auth()`, reject with 401 if unauthorized.
   - In `src/app/api/webhooks/resend-inbound/route.ts`: Fail closed (503 or 401) if `process.env.RESEND_INBOUND_SECRET` is unconfigured or signature is invalid.
   - In `src/app/api/cron/health-check/route.ts`: Remove Bearer token logging (`received: authHeader`), replace with safe static warning.
   - In `src/app/api/sniper/discard/route.ts`, `src/app/api/sniper/ingest/route.ts`, `src/app/api/sniper/worker/route.ts`, `src/app/api/cron/listings/expiry/route.ts`: Ensure the secret variable is checked for truthiness (`!secret || authHeader !== ...`) to prevent `Bearer undefined` bypass.
   - In `src/lib/cors.ts`: Restrict preview regex to Netlify previews only, removing wildcard Vercel subdomain matching (`shadowspark-[a-z0-9-]+\.vercel\.app`).
   - In `src/app/api/proxy/[[...slug]]/route.ts`: Strip client-supplied `x-tenant-id` and `x-tenant-slug` headers; resolve authoritative `tenantId` from `TenantMembership` via `session.user.id`.
   - In `src/app/api/operator/queue-stats/route.ts`: Require admin session.

2. Product & Paystack Fallback (P1):
   - The operator cannot complete Paystack onboarding. Do NOT fabricate credentials, bypass KYC, or use test mode as production. The app must fail safely if Paystack is unavailable.
   - In `src/app/api/paystack/initialize/route.ts` & `src/app/api/leads/[id]/initialize-demo-payment/route.ts`: Remove mock URL generation and fake auto-success in production. Return 503 Service Unavailable indicating online checkout is unavailable and routing to contact.
   - In `src/app/actions/checkout-actions.ts`: Remove mock Paystack link generation.
   - In `src/app/checkout/[leadId]/page.tsx` & `src/app/checkout/[leadId]/CheckoutClient.tsx`: Disable/hide broken Paystack checkout button. Display the intentional state: "Online checkout is currently unavailable. Contact us to start your pilot." with a clear button/link routing to `/contact`.
   - In `src/app/checkout/new/page.tsx`: Present the intentional fallback message and route to `/contact`.
   - In `src/app/(marketing)/pricing/page.tsx`: Update checkout CTAs to link to `/contact?plan=starter` and `/contact?plan=professional`.

3. Observability Hardening (P1):
   - In `src/app/api/health/route.ts`: Add `uptime: Math.floor(process.uptime())`, database ping latency, AI-ASSIST reachability check, and platform context (`provider: process.env.NETLIFY ? "netlify" : process.env.RENDER ? "render" : "local"`).
   - Create `src/app/api/ready/route.ts`: Minimal readiness endpoint delegating to health check.
   - In `src/workers/lead-worker.ts`, `src/workers/nudge-worker.ts`, `src/workers/follow-up-worker.ts`: Mask phone numbers and emails using a shared helper `src/lib/utils/redact.ts`.

4. Commercial Documentation (P1):
   - Create the 6 essential documentation files authored/drafted by Track E in `docs/runbooks/` and `docs/commercial/`:
     - `docs/runbooks/DEMO_RUNBOOK.md`
     - `docs/commercial/PILOT_OFFER.md`
     - `docs/runbooks/CUSTOMER_ONBOARDING_RUNBOOK.md`
     - `docs/commercial/CUSTOMER_EVIDENCE_TRACKING.md`
     - `docs/runbooks/MANUAL_PAYMENT_FALLBACK_RUNBOOK.md`
     - `docs/engineering/PAYSTACK_DEPENDENCY.md`
   (Extract exact content from `/home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_spec_miner_track_e/handoff.md`).

5. Verification & Tests:
   - Add focused unit/integration tests in `tests/api/payment-fallback.test.ts` or `tests/security/` to verify:
     - Fail-closed behavior on Paystack initialize when keys are absent (no mock URL or fake payment).
     - Health endpoint returns uptime and ready endpoint responds.
     - Protected routes reject unauthorized requests.
   - Run and verify all commands:
     - `npm test` (or `npx vitest run`)
     - `npm run test:secrets`
     - `npm run typecheck`
     - `npm run build`

Deliver your complete report to:
/home/moronto/AgentOps/worktrees/shadowspark-agy/.agents/teamwork_preview_worker_1/handoff.md
Notify the orchestrator via send_message when done.

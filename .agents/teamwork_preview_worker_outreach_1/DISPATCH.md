# DISPATCH — Worker Outreach (Milestone M-R1)

## Mission
Implement Milestone M-R1: Commercial Outreach Delivery & Pipeline Automation for the 10 target Nigerian fintechs.

## Inputs & Context
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T15:24:03Z)
- Master Scope: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_3/SCOPE.md`
- Survey Findings & Handoff: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_outreach_1/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_outreach_1`
- Parent Conversation ID: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`

## Bounded Write Ownership
You are STRICTLY CONFINED to writing and modifying ONLY these files:
- `scripts/seed-batch01-prospects.ts` (create)
- `scripts/dispatch-outreach.ts` (enhance)
- `scripts/sync-customer-evidence.ts` (create)
- `src/app/api/webhooks/whatsapp/meta/route.ts` (update)
- `src/lib/leads/nurture.ts` (update)
- `src/workers/follow-up-worker.ts` (update)
- `tests/outreach-pipeline.test.ts` (create)
- `docs/CUSTOMER_EVIDENCE.md` (sync from real data)
- `docs/FIRST_5_CUSTOMERS.md` (sync from real data)
- Metadata files inside your working directory (`.agents/teamwork_preview_worker_outreach_1/`)

DO NOT touch any file outside this bounded domain.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. **Seed Batch 01 Prospects (`scripts/seed-batch01-prospects.ts`)**:
   - Idempotently upsert the 10 target Nigerian fintech institutions into `prisma.lead`:
     - FairMoney MFB (`compliance@fairmoney.io`), Carbon (`compliance@getcarbon.co`), Renmoney MFB (`compliance@renmoney.com`), Branch Nigeria (`nigeria-compliance@branch.co`), Kuda MFB (`compliance@kuda.com`), PalmPay Nigeria (`compliance@palmpay-inc.com`), Quidax (`compliance@quidax.com`), Busha (`compliance@busha.co`), Yellow Card Nigeria (`compliance@yellowcard.io`), Flitaa (`compliance@flitaa.com`).
   - Store structured channel state in `Lead.metadata.channels` (`email`, `linkedin`, `whatsapp`).
2. **Enhance Dispatch Engine (`scripts/dispatch-outreach.ts`)**:
   - Add CLI support for:
     - 1-click link generation (preserve existing working functionality)
     - Live Resend API email dispatch via `sendOutreach`
     - Manual operator dispatch logging (`--channel linkedin|whatsapp --lead <id> --status sent`)
3. **WhatsApp Webhook Telemetry (`src/app/api/webhooks/whatsapp/meta/route.ts`)**:
   - Persist incoming delivery statuses (`delivered`, `read`, `failed`) into `Lead.metadata.channels.whatsapp`.
4. **Institutional Follow-Up Nurture (`src/lib/leads/nurture.ts` & `src/workers/follow-up-worker.ts`)**:
   - Replace outdated consumer "$10 audit" copy with institutional SEC Circular 26-1 / pilot offer copy.
5. **Evidence Ledger Synchronization (`scripts/sync-customer-evidence.ts`)**:
   - Query PostgreSQL for real prospect and pipeline events.
   - Synchronize `docs/CUSTOMER_EVIDENCE.md` and `docs/FIRST_5_CUSTOMERS.md` strictly from verified records.
   - Zero fake metrics: keep counts at 0 until actual events occur.
6. **Automated Unit & Pipeline Tests (`tests/outreach-pipeline.test.ts`)**:
   - Test prospect seeding idempotency, dispatch CLI operations, webhook event recording, and evidence sync.
7. **Verification**:
   - Run `npx vitest run tests/outreach-pipeline.test.ts`
   - Run `npm test`
   - Run `npm run test:secrets`
   - Run `npm run typecheck`
8. Write comprehensive `handoff.md` and send message to parent upon completion.

## 2026-09-17T15:33:18Z
You are Worker Outreach for Milestone M-R1. Your working directory is:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_outreach_1
Your task is defined in:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_outreach_1/DISPATCH.md
Read ORIGINAL_REQUEST.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (§ 2026-09-17T15:24:03Z).
Read your DISPATCH.md and the survey handoff at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_outreach_1/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Respect your bounded write ownership strictly. Implement the seeding script, dispatch engine, WhatsApp webhook telemetry, institutional nurture templates, evidence ledger synchronization, and tests. Run verification commands and write your handoff.md, then send a message back.

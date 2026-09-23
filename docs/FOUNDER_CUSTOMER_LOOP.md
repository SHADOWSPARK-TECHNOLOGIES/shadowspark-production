# Founder Customer Daily Control Loop — ShadowSpark

**Operating Objective**: Transition from engineering release phase to customer conversion and revenue generation.  
**Cadence**: Executed every business day by the founder/operator.  
**Discipline**: Engineering work is frozen in maintenance mode and may only interrupt this loop for **SECURITY**, **RELIABILITY**, **CUSTOMER BLOCKER**, or **REVENUE BLOCKER**.

---

## The 10-Step Daily Protocol

### Step 1: Check Production Health (08:00 WAT)
- Run automated verification:
  ```bash
  npx tsx scripts/demo-verification-runbook.ts
  ```
- Confirm:
  * Netlify frontend status: `READY`
  * Render AI-ASSIST backend: `HTTP 200` on `/healthz`
  * Zero 5xx edge errors in Netlify function logs.

### Step 2: Review Inbound Leads (08:30 WAT)
- Inspect database lead submissions via `/contact` or company email inbox.
- Score incoming leads against `docs/INITIAL_ICP.md` (Digital Lender, MFB, or VASP/Liquidity Desk).
- Flag high-priority prospects for same-day response.

### Step 3: Send Direct Outreach (09:00 – 10:30 WAT)
- Target: 10 new qualified prospects daily across LinkedIn, direct email, or WhatsApp using templates in `docs/OUTREACH_MESSAGES.md`.
- Target audience: Heads of Compliance, Chief Risk Officers, and Operations Founders.
- Maintain accurate logging in `docs/CUSTOMER_EVIDENCE.md`.

### Step 4: Run Scheduled Demos (11:00 – 14:00 WAT)
- Execute live walkthroughs using the structured talk track in `docs/DEMO_TALK_TRACK.md` and live runbook in `docs/DEMO_RUNBOOK.md`.
- Ensure presenter screen is logged into `https://shadowspark-production.netlify.app`.
- Showcase live review queue items and AI-ASSIST co-pilot briefs.

### Step 5: Capture Objections & Questions (Immediately Post-Demo)
- Log verbatim customer questions, objections, and regulatory concerns.
- Note any specific policy circulars cited by the prospect.
- Distinguish between real technical objections and standard sales resistance.

### Step 6: Update Customer Evidence Ledger (14:30 WAT)
- Update `docs/CUSTOMER_EVIDENCE.md`:
  * Increment `PROSPECTS_CONTACTED`, `DEMOS_BOOKED`, or `DEMOS_COMPLETED`.
  * Log notes under Customer Interaction Log.
  * Record all verbatim feedback items.

### Step 7: Fix ONLY Real Blockers (15:00 – 16:00 WAT)
- Classify any identified product issue:
  * **P0 / P1**: Stop and fix immediately following the Minimal Necessary Change rule.
  * **P2 / Backlog**: Document in backlog; DO NOT write code. Keep the commercial loop moving.

### Step 8: Execute Follow-Ups (16:00 – 17:00 WAT)
- Send post-demo summaries with `docs/PILOT_OFFER.md` within 2 hours of meeting.
- Follow up on outstanding proposals sent 48 hours earlier.
- Check in with active Day 7 pilot participants.

### Step 9: Record Payment & Commercial Signals (17:30 WAT)
- Check corporate bank / Paystack settlement reports for invoice settlements.
- Record confirmed payments and signed pilot term sheets in `docs/CUSTOMER_EVIDENCE.md`.
- Update commercial tenant status from `PILOT` to `ACTIVE`.

### Step 10: Daily Checkpoint & Handover (18:00 WAT)
- Update `docs/engineering/CURRENT_STATE.md` and `docs/engineering/ANTIGRAVITY_LEDGER.md`.
- Ensure git working tree is clean and uncommitted operational logs are preserved.
- Establish the single `NEXT_EXACT_ACTION` for the next business day.

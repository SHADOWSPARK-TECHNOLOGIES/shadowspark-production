# ShadowSpark — Live Product Demonstration Runbook

- **Document ID**: RB-COMM-001
- **Target Audience**: Solutions Architects, Sales Engineers, Platform Operators
- **Applicability**: Prospective Nigerian Fintechs, Digital Lenders, Asset Managers, and HNW Liquidity Movers
- **Last Updated**: 2026-09-18

---

## 1. Objective & Philosophy
This runbook provides a structured, repeatable 30-minute demonstration protocol for ShadowSpark's Sovereign Financial Node. 
**Key Principles**:
1. **Never Show Slides**: Demonstrate working code, real-time ledger balance, live regulatory intelligence, and actual audit streams.
2. **Anchor on Local Urgency**: Focus on active Nigerian regulatory realities (SEC Circular 26-1 June 2027 capital deadline, CBN BVN-Phone Lock, NDPC compliance).
3. **Prove Anti-Fragility**: Highlight double-entry ledger reconciliation ($\Sigma D - \Sigma C = 0$) and advisory-only AI guardrails.

---

## 2. Pre-Demo Checklist (T-15 Minutes)
- [ ] **Verify Operator Authentication**: Log in to `/operator` using an admin account. Confirm system health indicator is green.
- [ ] **Prepare Prospect Audit**:
  - Check if a `Lead` and `Demo` record exist for the prospect: `https://shadowspark.ng/demo/[prospect-slug]`.
  - If new prospect, submit their URL and company name via `/contact` or create via CLI:
    ```bash
    # Verify fallback audit loads cleanly
    curl -I https://shadowspark.ng/demo/target-prospect
    ```
- [ ] **Verify Compliance Review Queue**:
  - Open `/dashboard/reviews` in a separate browser tab.
  - Confirm the queue has sample briefs loaded (or mock data in staging).
- [ ] **Test Network & Audio**:
  - Ensure low-latency screen sharing. Close all unrelated browser tabs.

---

## 3. The 5-Act Demonstration Narrative (30 Minutes)

### Act 1: The Sovereign Positioning (Minutes 0–5)
- **Screen**: Public Landing Page (`/`)
- **Key Talking Points**:
  - "ShadowSpark is not a chat widget and not a generic CRM. It is a Sovereign Financial Node purpose-built for Nigerian institutional finance."
  - "Highlight the topbar: May 1st BVN Lock compliance, SEC Circular 26-1 capital reserve monitoring."
  - "Explain the core dilemma: International tools (Intercom, Zendesk) know nothing about Nigerian regulation; local messaging tools (Termii) lack financial ledgers and compliance infrastructure."

### Act 2: The Tailored Intelligence Stream (Minutes 5–12)
- **Screen**: `/demo/[prospect-slug]`
- **Key Talking Points**:
  - "Show the Live GCS Intelligence Feed tailored to their domain."
  - "Point out the Layout Mode badge (e.g., *Proof-Heavy* or *Objection-Handling*) dynamically derived from site crawl evidence."
  - "Walk through the Ranked Signals from Nigerian Regulators: CBN circulars, SEC ARIP guidelines, NDPC data protection mandates."
  - "Demonstrate the Proof Line and Objection Line: 'Our engine identifies exactly where your customer onboarding leaks momentum before they drop off.'"

### Act 3: Compliance Command & Exception Review (Minutes 12–20)
- **Screen**: `/dashboard/reviews` & `/dashboard/reviews/[briefId]`
- **Key Talking Points**:
  - "This is the compliance officer's command bridge: the AI-ASSIST Exception Review Queue."
  - "Show multi-tenant isolation: every brief is strictly scoped to the tenant identity derived from verified server authentication."
  - "Demonstrate Human-in-the-Loop Governance: AI generates advisory risk ratings and recommendations, but source-of-record business decisions require human authorization."
  - "Walk through a brief: view automated KYC risk analysis, inspect advisory annotations, and demonstrate operator override controls."

### Act 4: Financial Integrity & Double-Entry Ledger (Minutes 20–25)
- **Screen**: `/dashboard/audit` or `/dashboard/watchtower`
- **Key Talking Points**:
  - "Every financial event in ShadowSpark is anchored to a bank-grade double-entry ledger."
  - "Demonstrate the mathematical invariant: Total Debits minus Total Credits equals zero ($\Sigma D - \Sigma C = ₦0.00$)."
  - "Show RWA securitization module: illiquid Lagos real estate or treasury assets tokenized with fractional share ownership and regulatory reserve locks."

### Act 5: Operator Control Plane & Conversion Path (Minutes 25–30)
- **Screen**: `/operator` & Closing Proposal
- **Key Talking Points**:
  - "Show the Operator Command Center: live incoming leads, real-time tripwires, telemetry digests."
  - "Present the Pilot Offer: 14-day zero-risk trial or 30-day institutional deployment."
  - "Call to Action: 'We will provision your isolated tenant and configure your regulatory threshold rules within 24 hours.'"

---

## 4. Objection Handling Guide

| Objection | Recommended Response |
|---|---|
| *"We already use Intercom / Zendesk."* | "Intercom is a customer service chat tool. It cannot calculate your SEC Circular 26-1 capital adequacy, enforce BVN lock verification, or run a double-entry ledger. ShadowSpark replaces the fragmented compliance-and-conversion stack." |
| *"Can AI make autonomous financial decisions?"* | "Never. ShadowSpark enforces an advisory-only contract. The AI flags exceptions, scores risk, and prepares annotations. Authoritative financial and loan decisions strictly require operator authorization." |
| *"Where is our customer data stored?"* | "Data resides in isolated tenant partitions with NDPC compliance and AES-256 encryption. We never train public foundation models on customer transaction records." |
| *"How do we pay if we decide to launch?"* | "We issue a formal corporate pro-forma invoice with direct bank transfer to our corporate account, followed by instant manual operator activation." |

---

## 5. Post-Demo Follow-Up (Within 2 Hours)
1. Log demo completion in `/operator` (mark lead status as `demo_scheduled` or `QUALIFIED`).
2. Send follow-up email/WhatsApp:
   - Link to their personalized intelligence stream: `https://shadowspark.ng/demo/[slug]`.
   - Formal Pilot Offer document and pro-forma invoice.
   - 48-hour reservation window for onboarding engineering resources.

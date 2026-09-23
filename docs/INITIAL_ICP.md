# Initial Ideal Customer Profile (ICP) — ShadowSpark

**Product Baseline (Today)**:
- Live web dashboard with multi-tenant RBAC (`/dashboard`).
- Exception Review Queue (`/dashboard/reviews`) supporting `pending_review` and `annotated` states.
- AI-ASSIST v1.1.0 advisory brief generation (`/dashboard/reviews/[briefId]`).
- Immutable non-repudiation annotation logging with operator attribution.
- Fail-closed edge security and strict cryptographic tenant isolation.

---

## 1. Primary ICP: High-Velocity Digital Lenders & Consumer Credit Fintechs
- **Firm Type**: Licensed Nigerian Digital Lenders, Microfinance Banks (MFBs), and Buy-Now-Pay-Later (BNPL) platforms.
- **Headcount**: 15–100 employees.
- **Transaction / Application Volume**: 5,000 to 50,000 credit applications or disbursements per month.
- **Core Problem**: Daily deluge of KYC anomalies, BVN-phone mismatches, duplicate application attempts, and informal income narrative notes that fail automated scoring and stall in manual review queues.

---

## 2. Secondary ICP: Digital Asset Exchangers & OTC/VASP Desks
- **Firm Type**: Virtual Asset Service Providers (VASPs), crypto OTC desks, and cross-border payment aggregators operating under SEC Circular 26-1 / CBN AML directives.
- **Headcount**: 10–50 employees.
- **Transaction Volume**: 1,000 to 20,000 high-value transfers per month.
- **Core Problem**: Flagged counterparty wallets, rapid velocity alerts, and unstructured deposit narrative tags requiring human compliance officer review and formal audit logging before asset release.

---

## 3. The Buyer
- **Title**: Head of Compliance, Chief Risk Officer (CRO), or Co-Founder / COO.
- **Motivations**:
  * Regulatory survival: Avoiding CBN/SEC fines, license revocation, or personal officer liability.
  * Headcount efficiency: Reluctance to hire 5 more manual junior analysts just to read flagged logs.
  * Audit speed: Terrified of audit requests taking 3 weeks of spreadsheet archaeology.
- **Budget Authority**: Can authorize operational tooling in the ₦150k–₦450k/month range on corporate card or departmental operational expense.

---

## 4. The Daily User
- **Title**: Senior Compliance Officer, Risk Analyst, Credit Operations Specialist.
- **Daily Routine**:
  * Arrives at 8:30 AM to 150+ unreviewed exception flags.
  * Toggles between core banking portal, WhatsApp screenshots, credit bureau reports, and Excel sheets.
  * Writes manual notes explaining why a customer was cleared or blocked.
- **What They Want**: A single, clean queue that presents the facts and regulation immediately, lets them type an annotation, and moves to the next case in seconds.

---

## 5. The Pain
1. **Queue Paralysis**: Legitimate borrowers and depositors wait 12–48 hours for manual review, causing customer churn and drop-off.
2. **Reviewer Burnout**: Human analysts spend 80% of their time reading raw logs and looking up regulatory clauses, leaving only 20% for critical judgment.
3. **Audit Fragility**: Review decisions are scattered across Slack, email threads, and local spreadsheets without centralized cryptographic timestamps.
4. **Regulatory Anxiety**: Circular 26-1 requires documented governance, but teams lack structured tooling to prove compliance co-piloting.

---

## 6. The Trigger Event
- **External Trigger**: SEC Circular 26-1 compliance audit notice, CBN inspection notification, or sudden banking partner inquiry demanding explanation for high chargeback/flag rates.
- **Internal Trigger**: Transaction volume doubled over the last quarter, causing the review queue backlog to explode past 500 pending cases.

---

## 7. Why ShadowSpark
1. **Shipped & Proven**: Live in production on Netlify + Render + Neon today.
2. **Advisory, Not Invasive**: Does not attempt to replace the human officer or alter banking ledger state; acts strictly as an intelligence co-pilot.
3. **Bank-Grade Isolation**: Strict tenant segregation guarantees competitor data never cross-contaminates review queues.
4. **Local Currency Pricing**: Predictable Naira billing (₦150k / ₦450k/mo) rather than volatile USD enterprise software subscriptions.

---

## 8. Why Now
- Regulatory enforcement in Nigeria has transitioned from periodic paper audits to real-time AML/CFT monitoring.
- High inflation and interest rates have heightened credit fraud and synthetic identity attacks, multiplying exception rates.
- Fintechs can no longer afford to scale headcount linearly with volume.

---

## 9. What We Should NOT Promise (Strict Boundaries)
1. **Do NOT promise autonomous decision-making**: AI-ASSIST does not approve, disburse, or freeze accounts. Human officers must remain in the loop.
2. **Do NOT promise instant core-banking ERP replacement**: We are an exception control plane, not a full core banking system (CBS).
3. **Do NOT promise 100% fraud immunity**: We provide structured evidence and risk flags; final risk tolerance is the customer's legal responsibility.
4. **Do NOT promise bespoke local-server on-premise installation**: The platform is hosted on our verified cloud infrastructure (Netlify + Render + Neon).

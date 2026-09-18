# Customer Evidence & Pilot Feedback Tracking Runbook

- **Document ID**: COMM-EVID-001
- **Target Audience**: Customer Success, Product Management, Commercial Leads
- **Purpose**: Systematic tracking of pilot telemetry, qualitative feedback, conversion health, and case study generation
- **Last Updated**: 2026-09-18

---

## 1. Framework & Metrics Hierarchy

To validate product-market fit and drive expansion revenue, every pilot tracks three distinct evidence streams:

```
┌─────────────────────────────────────────────────────────────┐
│                   PILOT EVIDENCE STREAMS                    │
├──────────────────────────────┬──────────────────────────────┤
│  1. Quantitative Telemetry   │  2. Qualitative Feedback     │
│  • Verification throughput   │  • Weekly friction log       │
│  • Exception queue velocity  │  • Feature requests / gaps   │
│  • AI override percentage    │  • Executive sponsor NPS     │
├──────────────────────────────┴──────────────────────────────┤
│             3. Commercial Case Study Generation             │
│  • Anonymized ROI proof (hours saved, leakage prevented)    │
│  • SEC / CBN regulatory audit defense readiness             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Quantitative Telemetry Tracking

Every tenant's operational telemetry is monitored via `SystemEvent` and database metrics:

| Metric | Target SLA | Source of Truth |
|---|---|---|
| **Identity Verification Latency** | < 1,500 ms (p95) | Database logs / API telemetry |
| **Exception Queue Resolution Time**| < 30 minutes | `AuditLog` / AI-ASSIST annotation timestamps |
| **AI Recommendation Acceptance**  | > 85% without override | `ReviewQueueSummary` state transitions |
| **Ledger Reconciliation Balance** | Exactly ₦0.00 delta | `src/lib/ledger/index.ts` automated checks |
| **Zero Authentication Breaches**  | 100% fail-closed | Sentry / System telemetry tripwires |

---

## 3. Qualitative Interview Protocol (Weekly 15-Minute Check-in)

Customer Success conducts a weekly 15-minute sync with the pilot lead using this structured rubric:

### Question 1: Operational Friction
*"Where did your operators experience the highest friction or delay in the review queue this week?"*
- Log categorized friction: [UI/UX | Latency | Missing Data | Regulatory Ambiguity | False Positive].

### Question 2: Accuracy & Trust
*"Did the AI advisory summaries correctly flag high-risk transactions, or did your team have to override recommendations?"*
- Log override count and root causes for model fine-tuning.

### Question 3: Regulatory Confidence
*"How prepared does your compliance officer feel for the upcoming SEC Circular 26-1 / CBN audit based on the generated ledger?"*
- Score confidence on a scale of 1 to 5.

---

## 4. Evidence Ledger Schema

All pilot feedback and milestones must be recorded in the persistent ledger at `docs/commercial/evidence_ledger.csv`:

```csv
date,tenant_slug,pilot_day,contact_role,nps_score,key_quote,reported_bug_or_gap,action_taken
2026-09-20,zenith-cap,Day 3,Head of Compliance,5,"The double-entry ledger gives us the exact audit trail SEC auditors ask for.",Needed CSV export for board report,Added export endpoint
2026-09-27,kuda-credit,Day 10,Lead Risk Officer,4,"Exception queue reduced our loan triage time from 45m to 8m.",False positive on student passport format,Updated rPPG threshold
```

---

## 5. Case Study & Social Proof Generator

Upon pilot completion, transform verified telemetry into an institutional case study:
1. **Headline Formula**: *How [Anonymized Tier-1 Digital Lender] Reduced KYC Exception Triage Time by [X]% Ahead of the 2026 CBN Deadline.*
2. **Problem Statement**: Manual compliance review creating backlogs and risk of regulatory penalties under SEC Circular 26-1.
3. **ShadowSpark Solution**: Deployment of Sovereign Financial Node with automated exception review and double-entry ledger.
4. **Verified Results**:
   - 10,000+ verifications executed with zero security failures.
   - ₦0.00 ledger discrepancy across 30 days of treasury operations.
   - 100% compliance with NDPC data sovereignty mandates.

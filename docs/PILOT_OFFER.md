# ShadowSpark 14-Day Production Pilot Offer

## 1. Pilot Name
**ShadowSpark Compliance Acceleration Pilot (14-Day Guided Program)**

---

## 2. Target Customer
Licensed Nigerian Digital Lenders, Microfinance Banks, and Virtual Asset Service Providers (VASPs) processing >= 2,000 monthly transactions and handling manual exception reviews under SEC Circular 26-1 / CBN AML directives.

---

## 3. Problem
Compliance and risk teams spend 4–6 hours daily manually parsing raw exception logs, cross-referencing regulatory circulars, and documenting decisions in spreadsheets—creating backlogs, slowing customer onboarding, and risking regulatory audit penalties.

---

## 4. Scope
- **Tenancy**: 1 dedicated, cryptographically isolated tenant partition on the live ShadowSpark platform.
- **Users**: Up to 5 authorized compliance officers and 1 admin lead.
- **Surfaces Included**:
  * Edge-authenticated operator dashboard (`/dashboard`).
  * Exception Review queue (`/dashboard/reviews`).
  * AI-ASSIST advisory brief generator (`/dashboard/reviews/[briefId]`).
  * Non-repudiation annotation logging with timestamped audit history.
- **Volume Ceiling**: Up to 500 exception reviews processed during the 14-day window.

---

## 5. Deliverables
1. Dedicated tenant workspace provisioned within 24 hours of agreement.
2. Ingestion pipeline for staging exception batches or real-time webhook flags.
3. 30-minute interactive training session for compliance officers.
4. Weekly operational review report detailing triage time savings and risk indicators flagged.
5. End-of-Pilot Audit Trail Export demonstrating SEC/CBN compliance readiness.

---

## 6. Customer Inputs
- Designation of 1 Pilot Lead (Head of Compliance / CRO) and up to 4 reviewing officers.
- Staging or anonymized exception transaction data (minimum 25 sample flagged cases) via CSV upload or webhook endpoint.
- Commitment to attend a 15-minute Day 7 check-in and 30-minute Day 14 conclusion review.

---

## 7. ShadowSpark Inputs
- Cloud infrastructure provisioning, compute, and database storage (Netlify + Render + Neon).
- Upstream AI-ASSIST v1.1.0 advisory model compute and token allocation.
- Dedicated WhatsApp / Slack support channel for officer assistance.
- Lead Solutions Engineer assigned for rapid troubleshooting.

---

## 8. Success Criteria
1. **Speed**: Average time to review and annotate an exception brief drops by >= 60% compared to customer's baseline spreadsheet process.
2. **Adoption**: >= 80% of ingested pilot exceptions reviewed and annotated by customer officers.
3. **Audit Readiness**: Successful generation of 1 complete audit log export signed off by the customer's Compliance Lead.
4. **Reliability**: Zero unhandled 5xx service interruptions during officer review sessions.

---

## 9. Timebox
- **Duration**: Exactly 14 calendar days from tenant provisioning date.

---

## 10. Support Model
- **Channel**: Private shared Slack or WhatsApp Business channel.
- **Hours**: Monday – Friday, 8:00 AM – 6:00 PM WAT.
- **Response Time**: < 30 minutes for urgent review blockers; < 2 hours for operational inquiries.

---

## 11. Out-of-Scope (Strict Exclusions)
- Direct modification of customer's core banking ledger or automated fund disbursements.
- Integration with unverified on-premise legacy database servers.
- Bespoke custom AI model training on proprietary weights.
- Unlimited volume exceeding 500 exceptions during the pilot window.

---

## 12. Next Step After Pilot (Commercial Conversion)
Upon achieving the agreed success criteria on Day 14, customer transitions seamlessly to a paid production plan based on existing verified pricing tiers:
- **Starter Plan**: ₦150,000 / month (up to 2,500 monthly transactions, 3 operator seats).
- **Professional Plan**: ₦450,000 / month (up to 15,000 monthly transactions, 10 operator seats, priority AI-ASSIST co-pilot).
- **Enterprise Plan**: Custom annual agreement for high-velocity institutional desks.

*Pilot fee is waived with commitment to an annual subscription or credited 100% toward the first quarterly invoice.*

# First Customer Path — Cold Prospect to Commercial Conversion

This document maps the exact, shortest operational path from an uncontacted prospect to a paying customer for ShadowSpark's compliance control plane and AI-ASSIST review engine.

---

## The Journey Architecture

```text
VISITOR
  ↓
UNDERSTANDS PROBLEM
  ↓
UNDERSTANDS OFFER
  ↓
REQUESTS DEMO
  ↓
DEMO COMPLETED
  ↓
PILOT AGREED
  ↓
ACCOUNT / TENANT READY
  ↓
FIRST REVIEW WORKFLOW COMPLETED
  ↓
CUSTOMER FEEDBACK
  ↓
PAYMENT / COMMERCIAL DECISION
```

---

## Stage-by-Stage Breakdown

### 1. VISITOR
- **Entry Point**: Landing page (`https://shadowspark-production.netlify.app/`) or direct link from cold outreach.
- **Required User Action**: Clicks link, lands on page, reviews hero proposition ("AI Built for Nigeria. Shipped, Not Pitched.").
- **System Action**: Edge CDN serves pre-rendered HTML/assets within <1500ms; zero cookie walls or unneeded trackers.
- **Owner**: Growth / Outreach Operator.
- **Success Signal**: Time on page > 45s; scrolls past hero to product suite or clicks `/pricing`.
- **Failure Mode**: Bounce within <10s due to irrelevant messaging or slow load.
- **Blocker**: CDN outage, 5xx edge errors, broken mobile responsiveness.

---

### 2. UNDERSTANDS PROBLEM
- **Entry Point**: Problem statement on `/` and regulatory framing on `/faq`.
- **Required User Action**: Reads specific references to SEC Circular 26-1, VASP exception triaging, BVN/identity reconciliation, and audit friction.
- **System Action**: Renders structured FAQ accordions and risk mitigation explanations without marketing hype.
- **Owner**: Product Marketing.
- **Success Signal**: Navigates to `/faq` or reads compliance breakdown.
- **Failure Mode**: Prospect perceives product as generic US/EU tool rather than localized Nigerian compliance engine.
- **Blocker**: Vague or inaccurate regulatory terminology.

---

### 3. UNDERSTANDS OFFER
- **Entry Point**: Public pricing page (`/pricing`).
- **Required User Action**: Evaluates transparent Naira-denominated tiers (Starter at ₦150k/mo, Professional at ₦450k/mo, Enterprise Custom).
- **System Action**: Displays feature breakdown (automated BVN verification, rPPG liveness checks, Exception Review co-pilot, audit export).
- **Owner**: Commercial Lead.
- **Success Signal**: Identifies tier matching current transaction scale; clicks "Contact Sales" / "Get Started".
- **Failure Mode**: Price shock or confusion over volume ceilings.
- **Blocker**: Broken links or missing pricing details.

---

### 4. REQUESTS DEMO
- **Entry Point**: Contact form (`/contact`) or direct reply to WhatsApp / Email outreach.
- **Required User Action**: Submits name, work email, institution name, and monthly transaction volume.
- **System Action**: Validates input payload, records lead record in database, returns instant confirmation.
- **Owner**: Commercial Lead.
- **Success Signal**: Lead record created; automated acknowledgement delivered within 5 minutes.
- **Failure Mode**: Prospect abandons form midway due to excessive required fields.
- **Blocker**: Form submission failure (HTTP 500), CORS block, or unhandled database connection error.

---

### 5. DEMO COMPLETED
- **Entry Point**: 10-minute Google Meet / Zoom walkthrough via `docs/DEMO_RUNBOOK.md`.
- **Required User Action**: Prospect (Head of Compliance / CRO) attends meeting and watches live platform workflow.
- **System Action**: Live production application demonstrates fail-closed security, live Exception Review queue, and AI-ASSIST advisory briefs.
- **Owner**: Founder / Solutions Engineer.
- **Success Signal**: Prospect asks operational questions (e.g. "How do we feed our staging webhook into this queue?").
- **Failure Mode**: Live platform glitches, empty queue confusion, or presenter slips into engineering jargon.
- **Blocker**: Unplanned production downtime or AI-ASSIST upstream timeout.

---

### 6. PILOT AGREED
- **Entry Point**: Post-demo follow-up meeting / email with `docs/PILOT_OFFER.md`.
- **Required User Action**: Compliance Head signs 1-page Pilot Agreement (14-day evaluation, 5 operators, defined success criteria).
- **System Action**: Terms logged, onboarding checklist triggered.
- **Owner**: Commercial Lead.
- **Success Signal**: Signed LOI / Pilot confirmation returned within 48 hours.
- **Failure Mode**: Security / legal committee requests 60-page vendor risk assessment before pilot.
- **Blocker**: Unclear data retention terms or undefined IP boundaries.

---

### 7. ACCOUNT / TENANT READY
- **Entry Point**: Production Control Plane / Tenant Admin.
- **Required User Action**: Operator receives invite email, navigates to `/login`, sets password.
- **System Action**: Authoritative `Tenant` and `TenantMembership` provisioned in Neon PostgreSQL; strict cryptographic boundary verified.
- **Owner**: Platform Engineer / Antigravity.
- **Success Signal**: Operator successfully signs in; receives valid session cookie; redirected to `/dashboard/reviews`.
- **Failure Mode**: Password reset failure or tenant resolution mismatch.
- **Blocker**: Auth server failure or unverified tenant membership.

---

### 8. FIRST REVIEW WORKFLOW COMPLETED
- **Entry Point**: Exception Review dashboard (`/dashboard/reviews`).
- **Required User Action**: Officer selects flagged brief (`/dashboard/reviews/[briefId]`), reviews AI-ASSIST risk flags, submits annotation sign-off.
- **System Action**: Submits annotation to AI-ASSIST `/v1/review-queue/{brief_id}/annotations` with unique `Idempotency-Key`; updates queue state to `annotated`; creates immutable audit log.
- **Owner**: Compliance Officer (Customer) + Customer Success Lead.
- **Success Signal**: Time-to-first-reviewed-exception < 5 minutes; officer comments on speed.
- **Failure Mode**: Officer confused by UI actions or feels AI is overriding their authority.
- **Blocker**: Annotation API 500 error, AI timeout, or failure to persist audit record.

---

### 9. CUSTOMER FEEDBACK
- **Entry Point**: Day 7 pilot check-in call (15 minutes).
- **Required User Action**: Head of Compliance shares review throughput numbers and specific friction points.
- **System Action**: Feedback recorded in `docs/CUSTOMER_EVIDENCE.md`.
- **Owner**: Founder.
- **Success Signal**: Compliance Head notes >= 50% time saved on daily triaging.
- **Failure Mode**: Team stopped using the platform after day 2 due to lack of habit.
- **Blocker**: Unresolved UI defect preventing daily usage.

---

### 10. PAYMENT / COMMERCIAL DECISION
- **Entry Point**: Day 14 Pilot Conclusion Call.
- **Required User Action**: Customer selects annual or monthly subscription contract and initiates invoice payment.
- **System Action**: Generates invoice / Paystack payment checkout; transitions tenant from PILOT to ACTIVE.
- **Owner**: Founder / Commercial Lead.
- **Success Signal**: First payment received (e.g. ₦450,000 Professional tier).
- **Failure Mode**: Customer praises product but fails to secure budget authorization.
- **Blocker**: Inflexible payment options (e.g. inability to accept local bank transfer or corporate PO).

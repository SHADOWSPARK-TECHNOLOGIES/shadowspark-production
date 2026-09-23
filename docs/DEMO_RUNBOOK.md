# 5-to-10 Minute Executive Demo Runbook — ShadowSpark

**Audience**: Fintech Founders, Heads of Compliance, Chief Risk Officers, Institutional Liquidity Operators.  
**Goal**: Demonstrate automated compliance review, regulatory transparency under SEC Circular 26-1, and operational certainty without overwhelming the prospect with technical architecture.

---

## Part 1: The Problem Statement (1 Minute)

> *"In the 2026 Nigerian fintech and liquidity landscape, compliance is no longer a checklist—it is an active operational bottleneck. Under SEC Circular 26-1 and VASP requirements, financial institutions are processing thousands of high-velocity transactions, facing identity mismatches, BVN flags, and regulatory inquiries. Manual review queues are slow, error-prone, and expose operators to personal liability. ShadowSpark automates exception triaging and compliance review in real time."*

---

## Part 2: Live Product Entry (1 Minute)

1. Open the live production site in your browser:
   ```
   https://shadowspark-production.netlify.app
   ```
2. **What to point out**:
   - Institutional positioning: *"AI Built for Nigeria. Shipped, Not Pitched."*
   - Real products in market (e.g. Lodgist trust layer protecting students and landlords across tertiary institutions).
   - Instant regulatory clarity on `/pricing`: Transparent tiers (Starter at ₦150k/mo, Professional at ₦450k/mo) covering automated BVN verification, rPPG liveness, and audit-ready reporting.

---

## Part 3: Authentication & Security Boundary (1 Minute)

1. Navigate to `/dashboard` directly without logging in.
2. **What to point out**:
   - Observe the immediate fail-closed redirect to `/login`:
     > *"Notice that the application refuses access immediately without authenticated credentials. Our platform enforces institutional bank-grade security where unauthenticated requests are stopped at the edge."*
3. Enter authorized demo credentials and submit.
   - Browser receives secure, HTTP-only session cookies (`__Host-authjs.csrf-token`).

---

## Part 4: Compliance Review Queue (2 Minutes)

1. Navigate to the **Exception Review** surface:
   ```
   /dashboard/reviews
   ```
2. **What to point out**:
   - Single pane of glass for compliance officers.
   - Shows active transaction exceptions, severity levels, and automated regulatory flags.
   - Filter by status: `All`, `Pending Review`, and `Annotated`.
   - Clear empty states when the queue is clean, preventing operator confusion.

---

## Part 5: AI-ASSIST Advisory Interaction (2 Minutes)

1. Select a flagged brief or review entry (`/dashboard/reviews/[briefId]`).
2. **What to point out**:
   - Automated brief summarization: The AI-ASSIST engine analyzes transaction velocity, counterparty risk, and historical KYC metadata.
   - **Crucial Distinction**:
     > *"Our AI serves strictly as an advisory co-pilot for your compliance officers. It never silently overrides human decisions. It presents a structured risk analysis, highlights relevant circular clauses, and prepares the audit trail for your officer's sign-off."*
3. Submit an annotation or approval.
   - Audit trail is permanently recorded with exact timestamps and officer attribution.

---

## Part 6: Security & Tenant Isolation in Plain English (1 Minute)

> *"Your data never touches another institution's queue. ShadowSpark uses strict cryptographic tenant isolation. Every database query, every AI evaluation, and every audit log is mathematically partitioned to your organization. Even if a bad actor attempts to forge requests, our server validates the cryptographic tenant context on every single call."*

---

## Part 7: Business Value Summary (1 Minute)

- **90% reduction** in manual compliance triage time.
- **Audit certainty**: Complete mathematical audit trail ready for CBN/SEC inspection within seconds.
- **No headcount explosion**: Scale transaction volume 10x without hiring dozens of manual reviewers.

---

## Part 8: The Call to Action (30 Seconds)

> *"We are currently onboarding a select cohort of 5 fintech partners for a 14-day live pilot. We integrate directly with your test staging environment, run parallel exception reviews against real transactions, and demonstrate measurable operational hours saved.*
> 
> *Can we book your 14-day pilot onboarding for next Tuesday?"*

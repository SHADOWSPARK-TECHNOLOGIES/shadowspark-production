# Customer Onboarding Runbook — ShadowSpark

This runbook outlines the operational procedure to onboard a qualified fintech partner onto the live ShadowSpark platform without writing custom software.

---

## 1. Customer Qualification (Pre-Onboarding)
Before provisioning accounts, verify:
- [ ] Prospect is a registered business entity in Nigeria (RC number verified).
- [ ] Operates digital lending, payments, or virtual asset exchange workflows.
- [ ] Experiences >= 50 exception reviews weekly.
- [ ] Designates an authorized Pilot Lead (Compliance Officer / CRO) with authority to evaluate results.
- [ ] Signs 1-page Pilot Agreement based on `docs/PILOT_OFFER.md`.

---

## 2. Tenant Setup & Cryptographic Partitioning
1. **Tenant Provisioning**:
   - Operator creates the authoritative `Tenant` record in Neon PostgreSQL via database CLI or Prisma migration script:
     ```sql
     INSERT INTO "Tenant" (id, name, "companyName", "createdAt", "updatedAt")
     VALUES ('tenant_<company_slug>', '<Company Display Name>', '<Legal Entity Name>', NOW(), NOW());
     ```
2. **Tenant ID Convention**: Always use lowercase alphanumeric with underscores (e.g. `tenant_kuda_credit` or `tenant_crest_exchange`).

---

## 3. User Roles & Account Creation
1. **Role Matrix**:
   - `ADMIN`: Tenant Pilot Lead (Compliance Head). Can view all logs, manage operator seats, and export audit trails.
   - `MANAGER`: Senior compliance reviewer. Can review exceptions, submit annotations, and filter queues.
   - `AGENT`: Junior compliance reviewer. Can view assigned queues and draft annotations.
2. **Account Provisioning**:
   - Operator creates user accounts with initial secure passwords:
     ```sql
     INSERT INTO "User" (id, email, name, role, password, "createdAt", "updatedAt")
     VALUES ('user_<random_id>', 'lead@customer.com', 'Jane Doe', 'ADMIN', '<bcrypt_hash>', NOW(), NOW());

     INSERT INTO "TenantMembership" ("tenantId", "userId", role, "createdAt", "updatedAt")
     VALUES ('tenant_<company_slug>', 'user_<random_id>', 'ADMIN', NOW(), NOW());
     ```

---

## 4. Access Verification & Health Check
1. Operator navigates to `https://shadowspark-production.netlify.app/login` in an incognito window.
2. Performs test sign-in with customer credentials.
3. Confirms:
   - Browser receives secure `__Host-authjs.csrf-token` and session cookies.
   - Successful redirection to `/dashboard/reviews`.
   - Tenant name correctly rendered in dashboard header.
   - No 401/403 errors or blank screen crashes.

---

## 5. Required Data & Staging Ingestion
1. Customer provides initial sample batch of 25–50 flagged transaction exceptions via CSV or secure staging webhook.
2. Minimum data payload per exception:
   - `exception_id`: Unique external transaction / KYC identifier.
   - `applicant_name`: Full name of customer / counterparty.
   - `flag_reason`: Reason for manual hold (e.g. BVN mismatch, velocity spike).
   - `amount`: Transaction amount (if applicable).
   - `timestamp`: Original flag creation time.
3. Operator runs ingestion runner to register exceptions with upstream AI-ASSIST service under the customer's `X-Tenant-ID`.

---

## 6. Test Workflow & First Successful Review
Schedule a 30-minute interactive Zoom/Meet onboarding session:
1. **Minute 0–10**: Customer lead logs into `https://shadowspark-production.netlify.app/login`.
2. **Minute 10–20**: Lead navigates to `/dashboard/reviews`, opens the first flagged brief, and reviews the AI-ASSIST advisory findings.
3. **Minute 20–25**: Lead types an annotation (e.g., *"Reviewed proof of address: verified utility bill matches applicant name"*) and submits sign-off.
4. **Minute 25–30**: Verify:
   - Queue state updates from `pending_review` to `annotated`.
   - Audit trail records officer email and exact UTC timestamp.
   - First review successfully completed!

---

## 7. Support Contact & Communication Channels
- Dedicated WhatsApp Group or Slack Connect channel: `#shadowspark-<customer-name>-pilot`.
- Emergency Escalate Email: `support@shadowspark.tech`.
- Escalation SLA: Under 30 minutes for queue access blockers during business hours (8 AM – 6 PM WAT).

---

## 8. Feedback Capture (Day 7 Check-in)
On Day 7, conduct a 15-minute operational check:
- What percentage of daily exceptions were reviewed through ShadowSpark?
- Did the AI-ASSIST risk flags catch any real anomalies?
- Were there any UI confusion points or slow responses?
- Record findings directly into `docs/CUSTOMER_EVIDENCE.md`.

---

## 9. Pilot Completion & Commercial Conversion (Day 14)
1. **Audit Export**: Deliver signed CSV/PDF export of all reviews and annotations completed during the pilot.
2. **Executive Presentation**: Present the 1-page Pilot Summary showing:
   - Total exceptions triaged.
   - Estimated hours saved (e.g. 42 hours across 2 officers).
   - Zero regulatory audit compliance gaps.
3. **Transition to Production**:
   - Customer signs monthly or annual service agreement.
   - Tenant status updated to `ACTIVE`.
   - Setup ongoing webhook ingestion from production systems.

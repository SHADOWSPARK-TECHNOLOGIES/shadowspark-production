# Manual Invoicing & Bank Transfer Payment Fallback Runbook

- **Document ID**: RB-FIN-003
- **Audience**: Platform Operators, Finance Operations, Commercial Leads
- **Applicability**: Active until Paystack external business onboarding/KYC is complete
- **Last Updated**: 2026-09-18

---

## 1. Operational Rationale
Online card checkout via Paystack is currently unavailable pending corporate KYC verification. To maintain unhindered commercial sales, ShadowSpark operates a reliable, operator-managed **Manual Invoicing and Bank Transfer Fallback Path**. 

All payments are settled via Nigerian Inter-Bank Settlement System (NIBSS) Instant Payment (NIP) or wire transfer, followed by manual operator activation using the built-in control plane.

---

## 2. End-to-End Fallback Workflow
```
Client Requests Pilot / Plan via /contact or /pricing
  ↓
Operator Generates & Dispatches Pro-Forma Invoice
  ↓
Client Executes NIP Bank Transfer to Corporate Account
  ↓
Client Submits Transfer Receipt / Reference
  ↓
Finance Operator Verifies Funds in Bank Account
  ↓
Operator Executes "FORCE APPROVE" in /operator Dashboard
  ↓
System Updates Lead/Payment to "PAID" & Enqueues Crawl/Setup
  ↓
Client Receives Welcome Credentials & Receipt
```

---

## 3. Step-by-Step Operator Procedure

### Step 1: Lead Receipt & Invoice Generation
When a prospective customer submits a request via `/contact` or reaches out to start a pilot:
1. Locate the lead in `/operator` under **Lead Operations**.
2. Generate a Pro-Forma Invoice using the template below.
3. Assign an invoice reference number: `INV-SHSP-[YEAR]-[4-DIGIT-SEQUENCE]` (e.g., `INV-SHSP-2026-0104`).
4. Set invoice amount:
   - Demo Environment Deposit: **₦15,000**
   - Starter Tier Subscription: **₦150,000**
   - Professional Tier Subscription: **₦450,000**
   - 30-Day Institutional Pilot: **₦150,000**

### Step 2: Invoice Dispatch
Send the invoice PDF via email from `hello@shadowspark.ng` (or WhatsApp from the verified operator account) with clear transfer instructions.

---

## 4. Pro-Forma Invoice Template

```text
================================================================================
                       SHADOWSPARK TECHNOLOGIES
                    Sovereign Financial Infrastructure
                 Lagos, Nigeria | https://shadowspark.ng
                     Email: billing@shadowspark.ng
================================================================================

PRO-FORMA INVOICE: INV-SHSP-2026-0104
Date: September 18, 2026
Due Date: Upon Receipt / Within 5 Business Days

BILL TO:
Company Name:   [Customer Company Name]
Attention:      [Contact Person Name]
Email / Phone:  [Contact Email / WhatsApp]
TIN / RC:       [Customer RC Number]

--------------------------------------------------------------------------------
ITEM DESCRIPTION                               QTY    RATE (NGN)    AMOUNT (NGN)
--------------------------------------------------------------------------------
ShadowSpark Sovereign Deployment Deposit /        1    ₦15,000.00      ₦15,000.00
Pilot Environment Reservation
- Dedicated tenant partition
- Full credit applied toward first subscription
- SEC / CBN compliance monitoring suite
--------------------------------------------------------------------------------
                                              SUBTOTAL:               ₦15,000.00
                                              VAT (7.5%):                  ₦0.00 (Export/B2B Software)
                                              TOTAL DUE:              ₦15,000.00
--------------------------------------------------------------------------------

SETTLEMENT INSTRUCTIONS (NIBSS Instant Payment / Wire):
Bank Name:        [OPERATOR NIGERIAN COMMERCIAL BANK, e.g., GTBank / Zenith Bank]
Account Name:     SHADOWSPARK TECHNOLOGIES LTD
NUBAN Account No: [OPERATOR 10-DIGIT NUBAN ACCOUNT NUMBER]
Sort / Swift:     [BANK SORT CODE / SWIFT CODE]
Reference:        INV-SHSP-2026-0104 / [Customer Slug]

IMPORTANT: After executing transfer, please email payment proof (screenshot 
or NIP transaction reference) to billing@shadowspark.ng or reply on WhatsApp.
================================================================================
```

---

## 5. Step 3: Payment Verification & Ledger Reconciliation
1. **Bank Statement Check**: Finance operator confirms funds have cleared in the corporate account (credit alert verified, NIP session ID confirmed).
2. **Record Reference**: Note the NIP Session ID or reference string (e.g., `NIP-100004260918112233`).

---

## 6. Step 4: Manual System Activation in `/operator`

Once payment is verified, the operator activates the customer:

1. **Access Control Plane**:
   - Navigate to `https://shadowspark.ng/operator` (requires authenticated `admin` role).
2. **Locate Customer Lead**:
   - Find the customer's row in the **Pipeline Command Grid**.
   - If the lead does not yet have a payment reference, set `paymentRef` in database or trigger Nudge.
3. **Execute Force Approval**:
   - Click the **FORCE APPROVE** button (styled with green shield `ShieldCheck`).
   - This executes `POST /api/operator/force-approve-payment/[leadId]`.
4. **Automated Side Effects Verified**:
   - `Lead.status` becomes `"PAID"`.
   - `Lead.demoApproved` becomes `true`.
   - `Payment` record created with `status = "success"`.
   - `Demo` record created/updated with `approved = true`.
   - Background crawl enqueued automatically (`enqueueCrawl`).
   - Real-time Slack notification dispatched:
     ```
     🚀 New ShadowSpark Sale! (Operator Force-Approved)
     Lead: +2348012345678
     Business: Acme Financial
     Amount: $15.00 (starter tier)
     Reference: NIP-100004260918112233
     ```
5. **Issue Official Receipt**: Dispatch official PDF receipt confirming payment and crediting against future invoices.

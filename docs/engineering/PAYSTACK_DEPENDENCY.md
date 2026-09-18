# Paystack External Dependency & Fallback Architecture Specification

- **Document ID**: ADR-ARCH-007
- **Status**: ACCEPTED / IN_FORCE
- **Classification**: External Blocker / Commercial Fallback
- **Last Updated**: 2026-09-18

---

## 1. Context & Problem Statement
ShadowSpark's automated checkout pipeline was initially architected around Paystack for Naira card and bank payments. However, the operating corporate entity cannot complete live merchant onboarding at this time due to pending Corporate Affairs Commission (CAC) document validation and corporate banking KYC requirements.

### Prohibited Actions (Non-Negotiable)
- **NO Fake Credentials**: Fabricating production Paystack keys or mocking production webhooks is strictly prohibited.
- **NO Test Mode in Production**: Using Paystack `pk_test_` or `sk_test_` credentials in production environments is prohibited.
- **NO Broken Checkout UX**: Exposing broken checkout buttons that crash or throw unhandled JavaScript errors degrades institutional trust and violates release criteria.

---

## 2. Decision: Safe Fallback Architecture & Status

### Official Gate Status
```
PAYSTACK_STATUS=EXTERNAL_BUSINESS_ONBOARDING_BLOCKER
PAYMENT_FALLBACK_READY=YES
```

### Architectural Strategy
1. **Declare Paystack as an External Blocker**: The Paystack integration is classified as an external dependency awaiting business onboarding. The technical code remains frozen and ready for instant activation once KYC is finalized.
2. **Disable Online Card Checkout Safely**:
   - On the marketing pricing page (`/pricing`) and checkout routes (`/checkout/new`, `/checkout/[leadId]`), the broken card payment buttons are replaced with an intentional fallback state.
   - Intentional message:
     > *"Online checkout is currently unavailable. Contact us to start your pilot."*
   - CTA routing: All checkout CTAs route directly to `/contact` (or `/enterprise`) with pre-filled package metadata.
3. **Activate Operator-Managed Manual Payment Fallback**:
   - Transactions are invoiced via pro-forma invoices and settled via NIBSS Instant Payment (NIP) bank transfer.
   - Operator activates tenants via `POST /api/operator/force-approve-payment/[leadId]`.
4. **Remove Unsafe Mock Fallbacks**:
   - In `src/app/api/paystack/initialize/route.ts` and `src/app/api/leads/[id]/initialize-demo-payment/route.ts`, remove auto-success mock redirects (`/checkout/success?reference=mock...`). If unconfigured in production, routes must return an explicit HTTP 503 or 400 status indicating online checkout is unavailable.

---

## 3. UI/UX Fallback Component Specification

When `PAYSTACK_SECRET_KEY` is not present or unconfigured, the checkout UI must render:

```tsx
<div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-center">
  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
    <Building2 className="h-6 w-6" />
  </div>
  <h3 className="mt-4 text-lg font-bold text-white">
    Online Checkout Temporarily Unavailable
  </h3>
  <p className="mt-2 text-sm text-zinc-300">
    Direct card checkout is undergoing regulatory integration. You can reserve your 
    tailored pilot environment immediately via manual invoice and bank transfer.
  </p>
  <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
    <Link
      href="/contact?intent=pilot_reservation"
      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500"
    >
      Contact Us to Start Your Pilot
    </Link>
    <Link
      href="/pricing"
      className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
    >
      Review Plan Tiers
    </Link>
  </div>
</div>
```

---

## 4. Activation Protocol (Once Paystack KYC is Complete)
Once Paystack issues live production credentials:
1. Add `PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` to production environment secrets (Netlify / Render).
2. Set `PAYSTACK_WEBHOOK_SECRET` for webhook signature verification.
3. Configure Paystack webhook dashboard to point to `https://shadowspark.ng/api/webhooks/paystack`.
4. Re-enable the online payment button in checkout client components.
5. Execute a live ₦100 test transaction to verify end-to-end webhook idempotency and ledger settlement.

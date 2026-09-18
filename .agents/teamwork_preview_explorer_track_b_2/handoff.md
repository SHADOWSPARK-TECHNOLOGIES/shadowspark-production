# Track B (Product & Payment Fallback) Comprehensive Handoff Report

## Executive Summary
Track B investigation completed across marketing, authentication, dashboard navigation, exception review states, and payment/checkout infrastructure.
- **Product Surface**: Landing page, hero, and `/contact` flow are operational and backed by database lead persistence in `prisma.lead`.
- **Auth & Dashboard**: NextAuth with Edge middleware (`src/proxy.ts`) correctly guards `/dashboard/*` with fail-closed redirects to `/login`.
- **Core AI Compliance Review**: Both `/dashboard/reviews` and `/dashboard/reviews/[briefId]` implement all 10 required states (loading, empty, success, 400, 401, 403, 404, 409, 429, 503). 30/30 tests pass in `tests/dashboard-reviews.test.ts`.
- **Paystack Fallback**: Identified 6 files where unverified Paystack credentials cause broken popups or fabricate mock links (`isMockMode`). Designed minimal Ponytail-compliant changes to hide/disable broken checkout, present the intentional message: `"Online checkout is currently unavailable. Contact us to start your pilot."`, and route prospects into the existing `/contact` workflow.
- **Operator Manual Path**: Verified that `src/lib/payment-approval.ts` (`approvePayment`) and `POST /api/operator/force-approve-payment/[leadId]` are already operational to support manual bank transfer/invoicing.
- **Repository Health**: 298/298 tests pass, 9/9 secret checks pass, 0 type errors, production build compiles all 80 routes cleanly (exit code 0).

---

## 1. Observation

### 1.1 Marketing, Navigation, Hero & Demo/Contact CTAs
- **Root marketing route (`src/app/(marketing)/page.tsx`)**:
  - Composed of modular components: `<Hero />`, `<WhatWeDo />`, `<Flagship />`, `<HowWeWork />`, `<LiveDeployment />`, `<WhyShadowspark />`, `<Services />`, `<Stack />`, `<Contact />`, `<Footer />`.
- **Hero component (`src/components/landing/Hero.tsx:25-40`)**:
  - Primary CTA: `href="#flagship"` ("See What We've Built").
  - Secondary CTA: `href="/contact"` ("Start a Project").
  - Value propositions and trust badge: "Built in Nigeria · Production systems, not slides · You talk to the builder · Built to SOC 2 Principles".
- **Contact component (`src/components/landing/Contact.tsx:27-38`)**:
  - Client-side form posting to `/api/contact`. Captures `name`, `company`, `email`, `whatsapp`, `message`.
  - Direct contact channels: email (`hello@shadowspark.ng`), WhatsApp (`https://wa.me/234XXXXXXXXXX`), locations (Port Harcourt · Owerri).
- **Contact Route & API (`src/app/api/contact/route.ts:13-48`)**:
  - Verifies required fields (`name`, `email`, `message`).
  - Persists inquiry directly to PostgreSQL using `prisma.lead.upsert` with `status: "NEW"`, `intent: "CONTACT_FORM"`, and records `prisma.systemEvent.create({ type: "CONTACT_INQUIRY" })`.
  - Sends email via Resend if `RESEND_API_KEY` is configured; fails gracefully (`degraded: true`) if not configured without dropping the database lead record.
- **Footer component (`src/components/landing/Footer.tsx:38-53`)**:
  - Consistent company links to `/contact`, `/privacy`, `/terms`.

### 1.2 Auth Flow, Dashboard Entry & `/dashboard/*`
- **Edge Route Protection (`src/proxy.ts:6-25` / `middleware.ts`)**:
  - Uses `authConfig` from `src/auth.config.ts`.
  - Protects matcher routes: `["/dashboard/:path*", "/operator/:path*", "/admin/:path*", "/finance/:path*", "/support/:path*"]`.
  - Unauthenticated requests are immediately redirected to `/login` (fail closed).
  - Admin surfaces (`/operator`, `/admin`) enforce `userRole === "admin"`, redirecting unauthorized users to `/`.
- **Login Flow (`src/app/(auth)/login/page.tsx` & `src/app/actions/auth.ts:60-91`)**:
  - Supports both password login and WebAuthn/Passkey authentication (`<PasskeyClient mode="login" />`).
  - Calls `loginUser(formData)` server action which invokes `signIn("credentials", ...)`.
  - Normalizes role casing to lowercase (`user.role?.toLowerCase()`).
- **Dashboard Navigation & Composition (`src/lib/dashboard/navigation.ts:21-31` & `src/app/dashboard/layout.tsx`)**:
  - 9 registered dashboard navigation items categorized into 4 sections:
    - **Core**: Command Centre (`/dashboard`), Leads (`/dashboard/leads`)
    - **Compliance**: Audit Engine (`/dashboard/audit`), Watchtower (`/dashboard/watchtower`), Exception Review (`/dashboard/reviews`)
    - **AI & Ops**: Lead Scoring (`/dashboard/scoring`), WhatsApp AI (`/dashboard/whatsapp`), Intel (`/dashboard/competitors`)
    - **System**: Settings (`/dashboard/settings`)
  - Dashboard layout suppresses public widgets (e.g. ChatWidget) and fetches session identity via `/api/auth/session`.

### 1.3 Core Compliance / AI Review Workflows (10 Required States)
- **Queue Route (`src/app/dashboard/reviews/page.tsx`)**:
  - Interacts with authenticated backend adapter `/api/compliance/reviews`.
  - Renders all 10 required states with exact data test IDs:
    1. `state-loading`: Skeleton layout (`src/components/dashboard/Skeleton.tsx`)
    2. `state-empty`: `EmptyState` component ("Review Queue Clear")
    3. `state-success`: TanStack `DataTable` displaying brief ID, exception ID, queue state, SOR status, and created timestamp
    4. `state-400`: Validation failure warning
    5. `state-401`: Authentication required with redirect link to `/login`
    6. `state-403`: Access forbidden warning highlighting tenant membership requirement
    7. `state-404`: Queue resource not found
    8. `state-409`: Queue state conflict notice
    9. `state-429`: LLM rate limit governance warning
    10. `state-503`: Service unavailable with upstream status indicator
  - Enforces Advisory Invariant: prominent banner asserting AI compliance briefs are strictly advisory and cannot mutate core transaction ledgers.
- **Detail Route (`src/app/dashboard/reviews/[briefId]/page.tsx`)**:
  - Interacts with `/api/compliance/reviews/[briefId]` and `/annotations`.
  - Renders all 10 required detail states:
    `detail-state-loading`, `detail-state-empty`, `detail-state-success`, `detail-state-400`, `detail-state-401`, `detail-state-403`, `detail-state-404`, `detail-state-409`, `detail-state-429`, `detail-state-503`.
  - Displays raw AI-ASSIST v1.1.0 output in a formatted viewer with copy functionality.
  - Implements immutable human-in-the-loop operator annotation trail with client-side idempotency protection (`Idempotency-Key` header).
- **Test Verification (`tests/dashboard-reviews.test.ts`)**:
  - Executed command: `npx vitest run tests/dashboard-reviews.test.ts`
  - Result: **30 tests passed, 0 failed** in 715ms.

### 1.4 Paystack & Checkout Surface Inventory
A comprehensive inspection of payment and checkout code identified 6 primary touchpoints currently depending on Paystack:
1. **`src/app/(marketing)/pricing/page.tsx:26-77`**:
   - Starter and Professional pricing cards feature CTAs linking directly to `/checkout/new`.
   - FAQ line 86 advertises: *"We accept all major Nigerian bank transfers, Paystack payments, and international wire transfers."*
2. **`src/app/checkout/new/page.tsx:3-65`**:
   - Renders `CheckoutClient`, which captures company details and attempts to initialize a Paystack payment of ₦15,000.
3. **`src/app/checkout/[leadId]/page.tsx:7-68`**:
   - Uses `react-paystack` (`usePaystackPayment`) client-side hook with `process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
   - Displays a "Pay ₦15,000" button. When keys are unconfigured, this triggers a runtime error or broken popup modal.
4. **`src/app/checkout/[leadId]/CheckoutClient.tsx:25-48`**:
   - `handleCheckout` sends a POST request to `/api/paystack/initialize`.
5. **`src/app/api/paystack/initialize/route.ts:46-60`**:
   - Inspects `process.env.PAYSTACK_SECRET_KEY`.
   - Currently contains a mock fallback:
     ```ts
     if (!secretKey || secretKey.startsWith("mock") || secretKey === "") {
       const mockUrl = `/checkout/success?reference=${payment.reference}`;
       await prisma.lead.update({ where: { id: targetLeadId }, data: { paymentRef: payment.reference } });
       return NextResponse.json({ status: true, data: { authorization_url: mockUrl, reference: payment.reference } });
     }
     ```
   - This fabricates mock URLs and marks leads as paid in test mode, violating production safety rules.
6. **`src/app/actions/checkout-actions.ts:16-35`**:
   - `processCheckout` creates: `const mockPaystackLink = `https://checkout.paystack.com/test_${leadId}_${Date.now()}?amount=${demoDepositAmountKobo}`` and updates the lead with this mock link.
7. **`src/app/api/leads/[id]/initialize-demo-payment/route.ts:98-126` & `src/app/api/cron/nudge-demo-payments/route.ts:106-134`**:
   - Both routes include `isMockMode` blocks that fabricate mock Paystack references and enqueue fake WhatsApp nudge links.
8. **`src/lib/payments/paystack.ts:9-30`**:
   - Contains disbursement logic with a safe flag check: `if (process.env.PAYMENTS_ENABLED !== "true") return 0;`.
9. **`src/lib/payment-approval.ts:52-126` & `src/app/api/operator/force-approve-payment/[leadId]/route.ts:19-93`**:
   - Implements operator force approval: updates payment to `status: "success"`, lead to `status: "PAID"`, demo to `approved: true`, logs system events, and posts ledger entries. This provides the exact required infrastructure for operator-managed manual bank transfers!

---

## 2. Logic Chain

1. **Premise**: The operator cannot complete Paystack KYC/onboarding due to external business blockers. Fabricating credentials, bypassing KYC, or using test mode in production is strictly prohibited by repository rules (`ORIGINAL_REQUEST.md`).
2. **Consequence on Current Checkout**:
   - Directing prospective customers to `/checkout/new` or `/checkout/[leadId]` results in broken Paystack popups, network failures, or deceptive mock success redirects.
   - This damages customer trust and fails the production readiness gate.
3. **Requirement**: The application must fail safely, hide/disable the broken checkout, expose the intentional message:
   `"Online checkout is currently unavailable. Contact us to start your pilot."`,
   and route all high-intent traffic into the working `/contact` workflow.
4. **Ponytail Discipline Assessment**:
   - Under the Ponytail ladder:
     - Rung 1 (YAGNI): Do not build a complex multi-gateway failover or custom payment abstraction.
     - Rung 2 (Reuse): Re-route all purchase intent into the already functional, database-backed `/contact` route (`src/app/contact/page.tsx` and `src/app/api/contact/route.ts`).
     - Rung 5 & 6 (Shortest working diff): Point marketing CTA links to `/contact`, replace checkout buttons with static notice banners, and fail closed (HTTP 503) in the initialization API routes instead of running mock code.
5. **Operator Manual Fallback Path**:
   - Since `POST /api/operator/force-approve-payment/[leadId]` and `approvePayment()` are already implemented, the operator can manually invoice customers, receive direct bank transfers, verify payment off-platform, and approve the account with a single API call/admin action.

---

## 3. Caveats

1. **Paystack Webhook Endpoint (`src/app/api/webhooks/paystack/route.ts`)**:
   - The webhook handler correctly verifies HMAC-SHA512 signatures (`verifyPaystackSignature`). It does not need modification because without a live Paystack webhook secret, incoming unauthenticated calls fail closed with HTTP 401.
2. **Existing Leads with Status `demo_scheduled`**:
   - If the cron job `nudge-demo-payments` is triggered in production without Paystack configured, it should skip payment link creation rather than sending WhatsApp messages with mock URLs.
3. **Resend API Key Dependency**:
   - The `/api/contact` route persists all inquiries to PostgreSQL regardless of whether `RESEND_API_KEY` is provided. If `RESEND_API_KEY` is absent, the form submission succeeds and logs a degraded status, meaning no customer inquiry is lost.

---

## 4. Conclusion & Proposed Minimal Changes (Ponytail Discipline)

### 4.1 Status Summary
| Component | Status | Readiness |
|---|---|---|
| Marketing & Landing Page (`/`, Hero, CTAs) | Operational | YES |
| Demo / Contact Workflows (`/contact`, `/api/contact`) | Operational & DB-backed | YES |
| Auth & Dashboard Boundary (`/login`, `/dashboard/*`) | Secure (Edge Proxy Guarded) | YES |
| Exception Review UI (10 States) | Verified (30/30 vitest pass) | YES |
| Paystack Checkout (Current) | Broken / Mock Dependent | NO (Blocked externally) |
| Paystack Fallback UX | Proposed Minimal Fixes Ready | PENDING WRITER MERGE |
| Operator Manual Payment Path | Implemented & Operational | YES |

### 4.2 Exact Files to Modify & Minimal Proposed Changes

#### File 1: `src/app/(marketing)/pricing/page.tsx`
- **Location**: Lines 40, 58, and 86
- **Rationale**: Prevent prospective customers from clicking into broken `/checkout/new` routes; direct them directly to the pilot contact flow.
- **Proposed Diff Snippet**:
```tsx
// Before:
// href: "/checkout/new", cta: "Get Started"
// href: "/checkout/new", cta: "Start Free Trial"

// After:
  {
    name: "Starter",
    price: "₦150,000",
    period: "/month",
    description: "For emerging fintechs building their compliance foundation",
    icon: Zap,
    features: [ ... ],
    cta: "Start Pilot",
    href: "/contact?plan=starter",
  },
  {
    name: "Professional",
    price: "₦450,000",
    period: "/month",
    description: "For growing enterprises scaling their compliance operations",
    icon: Building2,
    popular: true,
    features: [ ... ],
    cta: "Start Pilot",
    href: "/contact?plan=professional",
  },
```
- **FAQ Update (Line 86)**:
```tsx
// Before: "We accept all major Nigerian bank transfers, Paystack payments, and international wire transfers."
// After: "We onboard pilot partners via corporate bank transfer and invoicing. Contact our team to activate your pilot instance."
```
- **Ponytail check**: `[code] → skipped: dynamic plan configuration builder; add when automated checkout is live.`

---

#### File 2: `src/app/checkout/new/page.tsx`
- **Location**: Line 52-66
- **Rationale**: If users navigate directly to `/checkout/new`, replace the active checkout form with the intentional pilot message and CTA button.
- **Proposed Diff Snippet**:
```tsx
export default async function NewCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-3">
          Online checkout is currently unavailable.
        </h2>
        <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
          Contact us to start your pilot. We configure tailored environments and support direct bank transfers.
        </p>
        <Link
          href="/contact"
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg"
        >
          Contact us to start your pilot
        </Link>
      </div>
    </div>
  );
}
```
- **Ponytail check**: `[code] → skipped: multi-step checkout wizard in unconfigured state; add when Paystack merchant account is active.`

---

#### File 3: `src/app/checkout/[leadId]/page.tsx`
- **Location**: Lines 153-164
- **Rationale**: Disable client-side `usePaystackPayment` invocation and replace the "Pay ₦15,000" button with the intentional fallback CTA routing to `/contact?leadId=...`.
- **Proposed Diff Snippet**:
```tsx
// Replace checkout button:
<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
  <p className="text-sm font-medium text-amber-200">
    Online checkout is currently unavailable. Contact us to start your pilot.
  </p>
  <Link
    href={leadId ? `/contact?leadId=${encodeURIComponent(leadId)}` : "/contact"}
    className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-4 text-base font-bold text-white hover:bg-emerald-500 transition-all shadow-[0_0_30px_rgba(16,149,106,0.3)]"
  >
    Contact us to start your pilot
  </Link>
</div>
```
- **Ponytail check**: `[code] → skipped: complex client error boundary retry loop; add when payment gateway is operational.`

---

#### File 4: `src/app/checkout/[leadId]/CheckoutClient.tsx`
- **Location**: Lines 20-48 and 183-191
- **Rationale**: Guard Step 2 of the mini-audit summary against broken Paystack calls; route users to `/contact`.
- **Proposed Diff Snippet**:
```tsx
// In step 2 button area:
<div className="space-y-3">
  <p className="text-xs text-amber-300 text-center font-medium">
    Online checkout is currently unavailable. Contact us to start your pilot.
  </p>
  <div className="flex gap-4">
    <Button type="button" onClick={() => setStep(1)} variant="outline" className="w-1/3">
      Back
    </Button>
    <Button asChild className="w-2/3 bg-emerald-600 text-white hover:bg-emerald-500">
      <Link href="/contact">
        Contact us to start your pilot
      </Link>
    </Button>
  </div>
</div>
```
- **Ponytail check**: `[code] → skipped: custom lead-save modal; add when gateway active.`

---

#### File 5: `src/app/api/paystack/initialize/route.ts`
- **Location**: Lines 46-60
- **Rationale**: Remove dangerous mock payment mode that generates fake `/checkout/success` URLs. Fail safely with HTTP 503.
- **Proposed Diff Snippet**:
```tsx
// Before:
// if (!secretKey || secretKey.startsWith("mock") || secretKey === "") { ... return mockUrl }

// After:
const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey || secretKey.startsWith("mock") || secretKey === "") {
  return NextResponse.json(
    {
      status: false,
      error: "Online checkout is currently unavailable. Contact us to start your pilot.",
      code: "PAYMENT_UNAVAILABLE",
    },
    { status: 503 }
  );
}
```
- **Ponytail check**: `[code] → skipped: sandbox transaction emulator; add real Paystack API keys when KYC clears.`

---

#### File 6: `src/app/actions/checkout-actions.ts`
- **Location**: Lines 14-36
- **Rationale**: Stop creating fake `https://checkout.paystack.com/test_...` URLs in server actions.
- **Proposed Diff Snippet**:
```tsx
// In processCheckout:
export async function processCheckout(...) {
  if (!data.termsAccepted) throw new Error("Terms must be accepted");
  throw new Error("Online checkout is currently unavailable. Contact us to start your pilot.");
}
```
- **Ponytail check**: `[code] → skipped: mock payment generation; preserved getLeadForPayment and verifyPayment for operator usage.`

---

#### File 7: `src/app/api/leads/[id]/initialize-demo-payment/route.ts` & `src/app/api/cron/nudge-demo-payments/route.ts`
- **Location**: `initialize-demo-payment:98-126` and `nudge-demo-payments:106-134`
- **Rationale**: Prevent the cron job and WhatsApp flow from generating fake mock links.
- **Proposed Diff Snippet**:
```tsx
// In initialize-demo-payment:
if (isMockMode) {
  return NextResponse.json(
    { error: "Online checkout is currently unavailable. Contact us to start your pilot.", code: "PAYMENT_UNAVAILABLE" },
    { status: 503 }
  );
}

// In nudge-demo-payments:
if (isMockMode) {
  console.log("[NudgeCron] Paystack unavailable. Skipping automated link creation.");
  results.skipped++;
  results.details.push({
    leadId: lead.id,
    status: "skipped",
    reason: "payment_gateway_unavailable",
  });
  continue;
}
```

---

## 5. Verification Method

To independently verify all claims made in this report:

1. **Dashboard Reviews 10-State Verification**:
   ```bash
   npx vitest run tests/dashboard-reviews.test.ts
   ```
   *Expected outcome*: 30/30 tests pass.

2. **Full Repository Test Suite**:
   ```bash
   npm test
   ```
   *Expected outcome*: 41/41 test files pass, 298/298 tests pass.

3. **Secret Leak Scan**:
   ```bash
   npm run test:secrets
   ```
   *Expected outcome*: 9/9 tests pass with zero credentials detected.

4. **TypeScript Typecheck**:
   ```bash
   npm run typecheck
   ```
   *Expected outcome*: Exits with code 0, zero errors.

5. **Production Build**:
   ```bash
   npm run build
   ```
   *Expected outcome*: Exits with code 0, 80/80 routes generated successfully.

6. **Paystack Mock Elimination Freshness Check**:
   Inspect `src/app/api/paystack/initialize/route.ts` and `src/app/actions/checkout-actions.ts` before and after writer implementation to confirm no mock URLs or fake references remain in active code paths.

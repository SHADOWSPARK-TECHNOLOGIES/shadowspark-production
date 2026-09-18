# Track A (Security) Comprehensive Audit Report

**Date**: 2026-09-18T11:58:30Z  
**Agent**: `teamwork_preview_explorer_track_a_2` (Explorer, Track A Security)  
**Target Repository**: `shadowspark-production` (`/home/moronto/AgentOps/worktrees/shadowspark-agy`)  
**Commit Inspected**: `40ba78e` (`agent/agy-production-readiness`)  

---

## Executive Summary

A comprehensive, evidence-based security audit of the repository was conducted across all 94 App Router API routes, root middleware, authentication configurations, tenant resolution systems, upstream service adapters, and secret scanners.

| Severity | Count | Summary |
|---|:---:|---|
| **P0 (Critical / Release Blocker)** | 3 | (1) Unauthenticated brand social media hijacking via `/api/threads/publish`; (2) Unauthenticated webhook with prompt injection & spoofed email dispatch via `/api/webhooks/resend-inbound`; (3) Payment bypass via automatic mock fulfillment in `/api/paystack/initialize` and `/api/leads/[id]/initialize-demo-payment`. |
| **P1 (High / Security & Tenant Blocker)** | 4 | (1) Authentication bypass via `Bearer undefined` on 4 endpoints when env vars are unset; (2) Overly permissive CORS preview regex in `src/lib/cors.ts` matching any `shadowspark-*.vercel.app` with `credentials: true`; (3) Catch-all proxy `/api/proxy/[[...slug]]` forwards client-supplied `X-Tenant-ID` without authoritative DB tenant resolution; (4) Unauthenticated operational queue metrics disclosure in `/api/operator/queue-stats`. |
| **P2 (Medium / Defense-in-Depth)** | 6 | (1) Passkey sign-in permanently disabled (503) in `/api/auth/verify-login`; (2) Passkey registration origin check bypass when `origin` is omitted in `/api/auth/verify-registration`; (3) Wildcard CORS on sniper and operator routes; (4) Un-rate-limited public mutating endpoints (`/api/chat`, `/api/contact`, `/api/qualify`, `/api/telemetry/error`); (5) Legacy user fallback to `user.id` as `tenantId` in `auth-service.ts`; (6) Missing `AI_ASSIST_SERVICE_TOKEN` fallback support in `ai-assist/auth.ts`. |
| **P3 / Verified Secure** | 5 | (1) Upstream `AI_ASSIST_API_TOKEN` strictly server-only with zero response/log leakage; (2) `npm run test:secrets` clean (9/9 pass); (3) Compound tenant scoping enforced across `v1` services (`loan`, `kyc`, `workflow`, `api-key`); (4) ChatWidget contained away from `/dashboard/*`, `/admin/*`, `/operator/*`; (5) NextAuth role normalization enforced in lower-case. |

---

## 1. Observation

### Focus Area 1: Protected Routes Failing Closed & Middleware Audit

1. **`src/proxy.ts` (Root `middleware.ts`):**
   - Exact code (`src/proxy.ts:27-35`):
     ```typescript
     export const config = {
       matcher: [
         "/dashboard/:path*",
         "/operator/:path*",
         "/admin/:path*",
         "/finance/:path*",
         "/support/:path*",
       ],
     };
     ```
   - Observed Fact: The Next.js middleware matcher **completely excludes `/api/*`**. All 94 route handlers in `src/app/api/*` must independently enforce authentication, authorization, and tenant isolation.
   - Observed Fact (`src/proxy.ts:12`): The middleware check tests `if (isOnDashboard || isOnOperator || isOnAdmin)`. Although `/finance/:path*` and `/support/:path*` are listed in `matcher`, they are not checked in the if-condition and would fall through unauthenticated if routes were added.

2. **Unauthenticated Public Route: `/api/threads/publish`:**
   - Exact code (`src/app/api/threads/publish/route.ts:11-29`):
     ```typescript
     export async function POST(request: Request) {
       const payload = await request.json().catch(() => null);
       const parsed = publishSchema.safeParse(payload);
       if (!parsed.success) {
         return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
       }
       try {
         const post = await createThreadsPost(parsed.data.text, {
           media_url: parsed.data.media_url,
           media_type: parsed.data.media_type,
         });
         return NextResponse.json({ success: true, post_id: post.post_id });
     ```
   - Observed Fact: `createThreadsPost` in `src/lib/threads-api.ts:48-76` fetches app access token using `THREADS_APP_ID` and `THREADS_APP_SECRET` and publishes directly to `https://graph.threads.net/v1.0/me/threads`. There is **zero authentication, zero session check, zero secret check, and zero rate limit**. Any external user can publish arbitrary content to the corporate Threads account.

3. **Unauthenticated Webhook: `/api/webhooks/resend-inbound`:**
   - Exact code (`src/app/api/webhooks/resend-inbound/route.ts:5-27`):
     ```typescript
     export async function POST(req: NextRequest) {
       const formData = await req.formData();
       const from = formData.get('from') as string;
       const text = formData.get('text') as string;

       const lead = await prisma.lead.findFirst({
         where: { email: from },
       });

       if (lead) {
         await prisma.emailEvent.create({
           data: {
             leadId: lead.id,
             type: 'replied',
             metadata: { text },
           },
         });

         await processInboundReply(lead.id, text);
       }

       return NextResponse.json({ received: true });
     }
     ```
   - Observed Fact: There is **no signature check, secret check, or authentication** (unlike `webhooks/resend/route.ts` which checks `RESEND_WEBHOOK_SECRET` with HMAC).
   - Observed Fact (`src/lib/email/reply-processor.ts:8-37`): `processInboundReply` interpolates raw `replyText` directly into a Gemini 2.0 Flash prompt (`"Inbound reply: \n"${replyText}""`), and immediately invokes `sendOutreach` to email the real lead.

4. **Unauthenticated Route: `/api/operator/queue-stats`:**
   - Exact code (`src/app/api/operator/queue-stats/route.ts:32-44`):
     ```typescript
     export async function GET() {
       try {
         const [crawl, leads] = await Promise.all([
           getQueueSnapshot(crawlQueue),
           getQueueSnapshot(leadSyncQueue),
         ]);

         return NextResponse.json({
           crawl,
           leads,
           generatedAt: new Date().toISOString(),
         });
     ```
   - Observed Fact: No `auth()`, no session validation, no role check. Anyone can view live BullMQ queue counts (waiting, active, completed, failed, delayed).

5. **`Bearer undefined` Authentication Bypass on Unset Secrets:**
   - Exact code across 4 routes:
     - `src/app/api/sniper/discard/route.ts:8-11`:
       ```typescript
       const authHeader = req.headers.get("authorization");
       if (authHeader !== `Bearer ${process.env.MOBILE_OPERATOR_KEY}`) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       }
       ```
     - `src/app/api/sniper/ingest/route.ts:22-25`:
       ```typescript
       const authHeader = request.headers.get('authorization');
       if (authHeader !== `Bearer ${process.env.INGEST_API_KEY}`) {
         return NextResponse.json({ error: "Unauthorized ingestion request" }, { status: 401 });
       }
       ```
     - `src/app/api/sniper/worker/route.ts:15-18`:
       ```typescript
       const authHeader = req.headers.get("authorization");
       if (authHeader !== `Bearer ${process.env.WORKER_SECRET}`) {
         return NextResponse.json({ error: "Unauthorized access to Lethal Analysis Engine" }, { status: 401 });
       }
       ```
     - `src/app/api/cron/listings/expiry/route.ts:6-9`:
       ```typescript
       const authHeader = req.headers.get("authorization");
       if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       }
       ```
   - Verification Command:
     ```bash
     node -e 'delete process.env.TEST_SECRET; console.log("Bearer undefined" !== `Bearer ${process.env.TEST_SECRET}`);'
     # Output: false (i.e. check does not reject; unauthorized access granted)
     ```
   - Observed Fact: In contrast, `src/app/api/sniper/fire/route.ts:11` properly checks `if (!process.env.MOBILE_OPERATOR_KEY || authHeader !== ...)`. The 4 routes above do not verify whether the secret is truthy. When the environment variable is not configured, supplying header `Authorization: Bearer undefined` bypasses authentication completely.

---

### Focus Area 2: Authoritative Tenant Isolation Audit

1. **Catch-All Proxy Header Injection (`src/app/api/proxy/[[...slug]]/route.ts`):**
   - Exact code (`src/app/api/proxy/[[...slug]]/route.ts:8-38`):
     ```typescript
     const session = await auth();
     if (!session?.user?.id) {
       return NextResponse.json(
         { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
         { status: 401 }
       );
     }
     ...
     const headers = new Headers(request.headers);
     headers.delete("host");
     headers.delete("content-length");
     headers.delete("content-encoding");

     const response = await fetch(url, { method, headers, ... });
     ```
   - Observed Fact: The proxy validates `session.user.id`, but **does NOT look up `TenantMembership`** or resolve tenant authoritatively.
   - Observed Fact: It passes client headers through to `BACKEND_API_URL`. Any authenticated user can send request header `X-Tenant-ID: victim-tenant-id` or `X-Tenant-Slug: victim-slug` to `/api/proxy/v1/tenant`, `/api/proxy/v1/loans`, `/api/proxy/v1/messages`, and `/api/proxy/v1/kyc`. The backend receives the spoofed tenant ID.

2. **Legacy User Tenant Fallback (`src/lib/api/v1/auth-service.ts`):**
   - Exact code (`src/lib/api/v1/auth-service.ts:62-68`):
     ```typescript
     const membership = await prisma.tenantMembership.findFirst({
       where: { userId: user.id },
       select: { tenantId: true },
       orderBy: { tenantId: "asc" },
     });

     const tenantId = membership?.tenantId ?? user.id; // fallback for legacy users
     ```
   - Observed Fact: If a user has no record in `tenantMembership`, `auth-service.ts` uses `user.id` as `tenantId` instead of returning 403 Forbidden / failing closed.

3. **Compliance & V1 Tenant Isolation (Verified Secure):**
   - `src/lib/ai-assist/server-auth.ts:65-75`: Authoritative lookup from `prisma.tenantMembership.findFirst({ where: { userId } })`. Fails closed with 403 Forbidden if membership or tenantId is missing.
   - `src/lib/tenant.ts:20-36`: Client header `x-tenant-slug` is strictly verified against `prisma.tenant.findUnique({ where: { id: tokenPayload.tenantId } })`. Mismatch throws `TENANT_MISMATCH` (HTTP 403).
   - `src/lib/api/v1/loan-service.ts:183-189, 241-250`: Compound queries enforce `where: { id: loanId, tenantId }`.
   - `src/lib/api/v1/kyc-service.ts:34-38, 140-144`: Compound queries enforce `where: { id: kycId, tenantId }`.
   - `src/lib/api/v1/workflow-service.ts:60-65`: Compound queries enforce `where: { id: workflowId, tenantId }`.
   - `src/lib/api/v1/api-key-service.ts:64-70`: Compound queries enforce `where: { id: apiKeyId, tenantId }`.

---

### Focus Area 3: Credential and Secret Exposure Audit

1. **`npm run test:secrets` Execution:**
   - Command: `node --test tests/security/credential-leak.test.mjs`
   - Result: 9 passed, 0 failed, duration 261ms.
   - All tracked files in git index scanned. Zero high-confidence credentials, private keys, or plaintext passwords found in tracked text.

2. **`NEXT_PUBLIC_` Variable Review:**
   - Exact search: `grep -rn "NEXT_PUBLIC_" src/`
   - Results:
     - `NEXT_PUBLIC_APP_URL`
     - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
     - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
     - `NEXT_PUBLIC_META_PIXEL_ID`
   - Observed Fact: Zero backend secrets, API tokens, database passwords, or service credentials are prefixed with `NEXT_PUBLIC_`.

3. **Git History Hygiene:**
   - `git diff 99d29ae..HEAD` and `git status`: No uncommitted secrets, `.env` files, or key leaks.

---

### Focus Area 4: AI-ASSIST Service Credentials Audit

1. **Server-Boundary Confinement:**
   - `src/lib/ai-assist/auth.ts:14-26`: Reads `optionalEnv("AI_ASSIST_API_URL")` and `optionalEnv("AI_ASSIST_API_TOKEN")`. Throws `AiAssistError("AI-ASSIST is not configured", 503, "SERVICE_UNAVAILABLE")` if missing.
   - `src/lib/ai-assist/auth.ts:32-49`: `buildAiAssistHeaders` attaches `Authorization: Bearer ${input.token}` strictly for upstream node `fetch`.
   - `src/lib/ai-assist/errors.ts:47-72`: `aiAssistErrorResponse` maps all errors to static sanitized messages in `SAFE_MESSAGES`. Upstream tokens, auth headers, and raw network exceptions are never serialized into response JSON or error payloads.
   - `src/components/ChatWidget.tsx:67-75`: ChatWidget explicitly suppresses itself on `/dashboard/*`, `/admin/*`, and `/operator/*`.

2. **Environment Variable Naming Observation:**
   - Observed Fact: The code in `src/lib/ai-assist/auth.ts:16` strictly reads `AI_ASSIST_API_TOKEN`. It does not fall back to `AI_ASSIST_SERVICE_TOKEN` (the name used in the task specification and docs). If an environment provides `AI_ASSIST_SERVICE_TOKEN`, `getAiAssistConfig()` fails with 503 unless `AI_ASSIST_API_TOKEN` is also set.

---

### Focus Area 5: Passkey / Auth Endpoints, CSRF & CORS Audit

1. **Permissive CORS Regex (`src/lib/cors.ts`):**
   - Exact code (`src/lib/cors.ts:8-16, 29-32`):
     ```typescript
     const PREVIEW_REGEX = /^https:\/\/(shadowspark-[a-z0-9-]+--shadowspark-production\.netlify\.app|deploy-preview-\d+--shadowspark-production\.netlify\.app|shadowspark-[a-z0-9-]+\.vercel\.app)$/;

     function getAllowedOrigin(request: Request): string | null {
       const origin = request.headers.get("origin");
       if (!origin) return null;
       if (ALLOWED_ORIGINS.includes(origin) || PREVIEW_REGEX.test(origin)) {
         return origin;
       }
       return null;
     }
     ...
     if (allowed) {
       headers["Access-Control-Allow-Origin"] = allowed;
       headers["Access-Control-Allow-Credentials"] = "true";
     }
     ```
   - Observed Fact: The pattern `shadowspark-[a-z0-9-]+\.vercel\.app` matches **any domain on Vercel** starting with `shadowspark-` (e.g. `https://shadowspark-attacker.vercel.app`).
   - Observed Fact: An attacker registering `shadowspark-evil.vercel.app` receives `Access-Control-Allow-Credentials: true` and can execute cross-origin authenticated reads against `/api/compliance/reviews`, `/api/compliance/briefs`, `/api/v1/messages`, and `/api/v1/workflows`.

2. **Payment Bypass via Automatic Mock Mode in Production:**
   - Exact code (`src/app/api/paystack/initialize/route.ts:47-60`):
     ```typescript
     const secretKey = process.env.PAYSTACK_SECRET_KEY;
     if (!secretKey || secretKey.startsWith("mock") || secretKey === "") {
       const mockUrl = `/checkout/success?reference=${payment.reference}`;
       await prisma.lead.update({
         where: { id: targetLeadId },
         data: { paymentRef: payment.reference }
       });
       return NextResponse.json({ 
         status: true,
         data: { authorization_url: mockUrl, reference: payment.reference } 
       });
     }
     ```
   - Exact code (`src/app/api/leads/[id]/initialize-demo-payment/route.ts:96-125`):
     ```typescript
     const secretKey = process.env.PAYSTACK_SECRET_KEY;
     const isMockMode = !secretKey || secretKey.startsWith("mock") || secretKey === "";
     if (isMockMode) {
       const mockReference = `demo_${id}_${Date.now()}`;
       ...
       const mockUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?reference=${mockReference}`;
       return NextResponse.json({ authorization_url: mockUrl, reference: mockReference, is_mock: true });
     }
     ```
   - Exact code (`src/app/checkout/success/page.tsx:11-18`):
     ```typescript
     if (reference) {
       const payment = await prisma.payment.findUnique({
         where: { reference },
         include: { lead: { include: { demo: true } } },
       });
       demoSlug = payment?.lead?.demo?.slug;
     }
     ```
   - Observed Fact: `checkout/success/page.tsx` does not check whether `payment.status === "paid"`. Any payment record in the database (including `pending` mock records) unlocks access and displays "Payment Verified" with "Launch Demo Surface".
   - Observed Fact: When Paystack is unavailable or unconfigured, the application generates fake references and auto-fulfills access rather than failing safely and exposing the required fallback UX ("Online checkout is currently unavailable. Contact us to start your pilot.").

3. **Passkey Verification Gaps:**
   - `src/app/api/auth/verify-login/route.ts:8-13`: Returns HTTP 503 `"Passkey sign-in is temporarily unavailable. Use password or OAuth sign-in."` (Assertion verification not implemented).
   - `src/app/api/auth/verify-registration/route.ts:142-150`:
     ```typescript
     if (
       clientData.origin &&
       !ALLOWED_ORIGINS.includes(clientData.origin as string)
     ) {
       return NextResponse.json({ error: `Origin not allowed: ${clientData.origin}` }, { status: 400 });
     }
     ```
     If `clientData.origin` is omitted or empty, the check is skipped. W3C WebAuthn Section 7.1 requires that `origin` be present and match the RP origin.

4. **Wildcard CORS on Administrative Endpoints:**
   - `src/app/api/sniper/discard/route.ts:25`: `{ headers: { 'Access-Control-Allow-Origin': '*' } }`
   - `src/app/api/sniper/fire/route.ts:46`: `{ headers: { 'Access-Control-Allow-Origin': '*' } }`
   - `src/app/api/operator/leads/route.ts:41`: `{ headers: { 'Access-Control-Allow-Origin': '*' } }`
   - `src/app/api/operator/metrics/route.ts:50`: `{ headers: { 'Access-Control-Allow-Origin': '*' } }`

---

## 2. Logic Chain

1. **Protected Route Call Chain & Exposure Logic:**
   - Observation 1.1 shows root middleware matcher does not include `/api/*`.
   - Therefore, any `/api/*` route handler without explicit internal `auth()` or token verification executes without an authentication gate.
   - Observations 1.2, 1.3, and 1.4 show `/api/threads/publish`, `/api/webhooks/resend-inbound`, and `/api/operator/queue-stats` lack any authentication calls.
   - **Deduction**: These endpoints are directly callable by any unauthenticated remote client. In the case of `/api/threads/publish`, this allows unauthorized posting via official corporate credentials (P0). In the case of `/api/webhooks/resend-inbound`, spoofed inbound emails trigger automated AI generation and outbound messages to real leads (P0).

2. **Missing Secret Fall-Through Logic:**
   - In JavaScript string interpolation, `${undefined}` evaluates to `"undefined"`.
   - Observation 1.5 shows 4 route handlers evaluate `authHeader !== 'Bearer ' + process.env.SECRET`.
   - Node test execution verified that `"Bearer undefined" !== 'Bearer ' + undefined` is `false`.
   - **Deduction**: If `MOBILE_OPERATOR_KEY`, `INGEST_API_KEY`, `WORKER_SECRET`, or `CRON_SECRET` is unset in production, an attacker sending `Authorization: Bearer undefined` bypasses the gate completely (P1).

3. **Tenant Isolation Call Chain in Proxy:**
   - Observation 2.1 shows `src/app/api/proxy/[[...slug]]/route.ts` requires `session.user.id`, but forwards all incoming client headers to `BACKEND_API_URL` without stripping or validating `X-Tenant-ID`.
   - **Deduction**: A low-privileged authenticated user from Tenant A can supply `X-Tenant-ID: tenant-b` in their request headers, and the proxy forwards it as authoritative to the backend API, defeating multi-tenant isolation across proxied endpoints (P1).

4. **CORS Credential Exfiltration Logic:**
   - Observation 5.1 shows `PREVIEW_REGEX` matches `shadowspark-[a-z0-9-]+\.vercel\.app` and responds with `Access-Control-Allow-Credentials: true` and reflection of the origin.
   - Any third party can create a free Vercel project matching that prefix (e.g. `shadowspark-poc.vercel.app`).
   - When an authenticated user visits the third-party site, client-side script can execute cross-origin `fetch` requests with cookies to `/api/compliance/reviews` and read response data.
   - **Deduction**: Overly broad regex allows cross-origin credentialed access to sensitive compliance and tenant data (P1).

5. **Payment Mock Fulfillment Logic:**
   - Observation 5.2 shows `/api/paystack/initialize` and `/api/leads/[id]/initialize-demo-payment` generate a mock reference and redirect to `/checkout/success` when `PAYSTACK_SECRET_KEY` is empty or missing.
   - `/checkout/success` verifies only that the payment record exists, not that `status === "paid"`.
   - The user specification mandates: "The operator cannot complete Paystack onboarding. Do NOT fabricate credentials, bypass KYC, or use test mode as production... Hide/disable the broken checkout. Expose an intentional state: 'Online checkout is currently unavailable. Contact us to start your pilot.'"
   - **Deduction**: Production code currently simulates successful payments and fulfills access rather than disabling checkout and directing to manual contact (P0/P1).

---

## 3. Caveats

- **External Backend Implementation:** The upstream service behind `BACKEND_API_URL` was not directly inspected (it runs as an external service on Render). Our finding on `/api/proxy` focuses on the client header forwarding behavior in the Next.js gateway.
- **Render/Netlify Environment Variables:** We verified the repository code and `.env.example`. Actual deployed environment variables on Render or Netlify were not directly inspected via shell; analysis evaluates behavior under both present and missing variable states.
- **Paystack Webhook Endpoint Redundancy:** There are two webhook endpoints (`/api/paystack/webhook` and `/api/webhooks/paystack`). Both implement HMAC sha512 verification, but differing configurations between the two could create operational divergence.
- **No Active Exploits Authored:** Per safety guidelines and role definition, this audit is purely analytical and defensive; no active exploit scripts were generated.

---

## 4. Conclusion

The repository exhibits strong security engineering in its core AI-ASSIST compliance adapter (strict fail-closed auth via `resolveComplianceAuth`, compound tenant queries, clean token boundary, and sanitized errors) and passes automated secret leak tests (`npm run test:secrets`). 

However, **production release is currently blocked by 3 P0 vulnerabilities and 4 P1 vulnerabilities**:

1. **[P0] Social Media Account Takeover:** `src/app/api/threads/publish/route.ts` must be protected by an admin auth guard or deleted if unused.
2. **[P0] Unauthenticated Resend Webhook & Email Spoofing:** `src/app/api/webhooks/resend-inbound/route.ts` must verify Resend webhook signatures (`svix` / signing secret) or be disabled.
3. **[P0] Mock Payment Bypass in Production:** Paystack initialization endpoints must stop generating mock successful checkouts in production. When Paystack is unavailable, checkout must fail closed and direct users to contact the operator.
4. **[P1] Missing Secret `Bearer undefined` Bypass:** `src/app/api/sniper/discard/route.ts`, `sniper/ingest/route.ts`, `sniper/worker/route.ts`, and `cron/listings/expiry/route.ts` must verify the secret variable is truthy (`if (!secret || authHeader !== ...)`) before comparing.
5. **[P1] Permissive CORS Preview Regex:** `src/lib/cors.ts` must remove wildcard Vercel subdomain matching (`shadowspark-[a-z0-9-]+\.vercel\.app`) or restrict to exact production/staging origin URLs.
6. **[P1] Proxy Header Forwarding & Tenant Spoofing:** `src/app/api/proxy/[[...slug]]/route.ts` must strip client-supplied `X-Tenant-ID` and `X-Tenant-Slug` headers and resolve the authoritative tenant from the session's `TenantMembership`.
7. **[P1] Operator Queue Metrics Information Disclosure:** `src/app/api/operator/queue-stats/route.ts` must require an authenticated admin session.

---

## 5. Verification Method

To independently reproduce and verify each finding:

1. **Verify Secret Scanner Status:**
   ```bash
   npm run test:secrets
   # Direct observation: 9 passed
   ```

2. **Verify `Bearer undefined` Auth Bypass:**
   ```bash
   node -e '
   const secret = process.env.UNSET_SECRET;
   const authHeader = "Bearer undefined";
   console.log("Bypass succeeds:", authHeader === `Bearer ${secret}`);
   '
   # Outputs: Bypass succeeds: true
   ```
   Inspect lines in:
   - `src/app/api/sniper/discard/route.ts:9`
   - `src/app/api/sniper/ingest/route.ts:23`
   - `src/app/api/sniper/worker/route.ts:16`
   - `src/app/api/cron/listings/expiry/route.ts:7`

3. **Verify Unauthenticated Routes:**
   Inspect absence of `auth()`, `requireAuthContext()`, or secret checks in:
   - `src/app/api/threads/publish/route.ts`
   - `src/app/api/webhooks/resend-inbound/route.ts`
   - `src/app/api/operator/queue-stats/route.ts`

4. **Verify CORS Regex Vulnerability:**
   ```bash
   node -e '
   const PREVIEW_REGEX = /^https:\/\/(shadowspark-[a-z0-9-]+--shadowspark-production\.netlify\.app|deploy-preview-\d+--shadowspark-production\.netlify\.app|shadowspark-[a-z0-9-]+\.vercel\.app)$/;
   console.log("Attacker origin matches:", PREVIEW_REGEX.test("https://shadowspark-attacker.vercel.app"));
   '
   # Outputs: Attacker origin matches: true
   ```

5. **Verify Mock Payment Logic:**
   Inspect lines 47-60 in `src/app/api/paystack/initialize/route.ts` and lines 96-125 in `src/app/api/leads/[id]/initialize-demo-payment/route.ts`.

---

## Required Actionable Remediations for Implementation Agent

```typescript
// 1. In src/app/api/threads/publish/route.ts:
// Require admin session:
const session = await auth();
if (session?.user?.role?.toLowerCase() !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 2. In src/app/api/webhooks/resend-inbound/route.ts:
// Verify signature or reject if unconfigured:
const secret = process.env.RESEND_INBOUND_SECRET;
if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

// 3. In all token-check routes (sniper/discard, sniper/ingest, sniper/worker, cron/listings/expiry):
const secret = process.env.REQUIRED_SECRET?.trim();
if (!secret || authHeader !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 4. In src/lib/cors.ts:
// Remove broad vercel regex, match only verified deployment preview prefixes:
const PREVIEW_REGEX = /^https:\/\/(shadowspark-[a-z0-9-]+--shadowspark-production\.netlify\.app|deploy-preview-\d+--shadowspark-production\.netlify\.app)$/;

// 5. In src/app/api/proxy/[[...slug]]/route.ts:
// Strip untrusted tenant headers before forwarding:
headers.delete("x-tenant-id");
headers.delete("x-tenant-slug");
// Authoritatively attach tenant:
const membership = await prisma.tenantMembership.findFirst({ where: { userId: session.user.id } });
if (membership?.tenantId) headers.set("x-tenant-id", membership.tenantId);

// 6. In src/app/api/operator/queue-stats/route.ts:
const session = await auth();
if (session?.user?.role?.toLowerCase() !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

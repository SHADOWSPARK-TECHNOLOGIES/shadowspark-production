# Handoff Report: Authentication, Tenancy, RBAC & Frontend Security Investigation

- **Agent**: AUTH_TENANT_SECURITY & Frontend Explorer (`teamwork_preview_explorer_auth_1`)
- **Parent Orchestrator**: `orchestrator_1` (`e1df41dd-f8ac-4c2f-8937-0ec8a3377e8a`)
- **Working Directory**: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_auth_1`
- **Milestone Scope**: Milestone 3 (Adapter Auth), Milestone 4 (Exception Review UI), Milestone 5 (Historical Frontend Findings)
- **Investigation Type**: Read-Only Analysis

---

## 1. Observation

### 1.1 NextAuth & Auth Boundary in `src/`

#### 1.1.1 Session Handling & Token Parsing
- **NextAuth Strategy**: NextAuth v5 is configured with JWT session strategy (`src/auth.config.ts:18`: `session: { strategy: "jwt" }`).
- **Edge Configuration (`src/auth.config.ts`)**:
  - `callbacks.jwt` (`src/auth.config.ts:48-55`):
    ```ts
    async jwt({ token, user }) {
      if (user && user.id) {
        token.sub = user.id;
        if ("role" in user && user.role) {
          token.role = user.role as string;
        }
      }
      return token;
    }
    ```
  - `callbacks.session` (`src/auth.config.ts:57-68`):
    ```ts
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    }
    ```
  - **Critical Omission**: NextAuth JWT and session completely lack any `tenantId` property.
- **Node.js Configuration (`src/auth.ts`)**:
  - Authorize callback (`src/auth.ts:27-48`) reads from `prisma.user.findUnique({ where: { email } })` and compares password via `bcrypt.compare`. On match, returns `{ id: user.id, email: user.email, role: user.role }`.
  - OAuth sign-in callback (`src/auth.ts:53-95`) links or creates `prisma.user` with `role: "user"` and empty sentinel password (`password: ""`). It mutates `user.id = dbUser.id` and `user.role = dbUser.role`.
  - No tenant or membership lookup occurs during any NextAuth sign-in flow.
- **Root Middleware (`middleware.ts:4-13`)**:
  - Next.js executes `export const { auth: middleware } = NextAuth(authConfig);` matching `/dashboard/:path*`, `/admin/:path*`, `/finance/:path*`, `/support/:path*`.
  - Authorized check (`src/auth.config.ts:33-47`) only evaluates `const isLoggedIn = Boolean(auth?.user)`. It does NOT enforce RBAC roles.
- **Unused Proxy File (`src/proxy.ts`)**:
  - Defines an `auth((req) => ...)` middleware attempting role-based checks (`src/proxy.ts:15-20`):
    ```ts
    const userRole = (req.auth?.user as { role?: string } | undefined)?.role?.toLowerCase();
    if ((isOnOperator || isOnAdmin) && userRole !== "admin") {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    ```
  - **Defect**: Next.js does NOT execute `src/proxy.ts`. Next.js only executes root `middleware.ts`. Thus, the role restriction in `src/proxy.ts` is dead code.

#### 1.1.2 Tenant Resolution
- **Fintech Bearer Token Context (`src/lib/api/auth-context.ts`)**:
  - Extracts Bearer token from header (`src/lib/api/auth-context.ts:16-28`).
  - Verifies token using `verifyAuthToken` (`src/lib/auth.ts:79-118`), requiring `{ sub, tenantId, role, email }` signed with `JWT_SECRET`.
  - Resolves tenant via `resolveTenantIdFromRequest(request, payload)` (`src/lib/tenant.ts:16-39`):
    - Optional `X-Tenant-Slug` header is validated against the database: `prisma.tenant.findUnique({ where: { id: tokenPayload.tenantId } })`.
    - If `tenant.name !== slug && tenant.companyName !== slug`, throws `TENANT_MISMATCH` (HTTP 403).
    - Authoritative tenant ID is strictly `tokenPayload.tenantId`. Request input never overrides authenticated context.
- **Tenant Context AsyncLocalStorage (`src/lib/tenant-context.ts:1-17`)**:
  - Provides `runWithTenantContext(tenantId, handler)` and `getTenantContextId()`.
  - Used by background workers (`src/workers/kyc.worker.ts:57`, `src/workers/messaging.worker.ts:107`) and Twilio webhooks (`src/app/api/webhooks/twilio/route.ts:289`).
- **Web Registration Tenancy Gap (`src/app/actions/auth.ts:41-48`)**:
  - The web registration server action creates a `User` record with `role: "user"`, but does NOT create a `Tenant` or `TenantMembership`.
  - Users created via the web UI are completely tenantless.
- **Fintech Registration Tenancy (`src/lib/api/v1/auth-service.ts:30-45`)**:
  - Creates `User`, `Tenant`, and `TenantMembership` (`role: "ADMIN"`), returning a signed JWT with `tenantId: tenant.id`.
- **Legacy Fallback Defect (`src/lib/api/v1/auth-service.ts:68`)**:
  - `const tenantId = membership?.tenantId ?? user.id; // fallback for legacy users`
  - Assumes `user.id` is a valid tenant ID when no membership exists, which violates strict multi-tenant isolation.
- **Twilio Webhook Fallback Defect (`src/app/api/webhooks/twilio/route.ts:25`, `src/app/api/v1/webhooks/twilio/route.ts:8`)**:
  - `const TENANT_ID = process.env.TWILIO_LOAN_TENANT_ID?.trim() || "public";`
  - Hardcoded string `"public"` is used as fallback tenant ID.

#### 1.1.3 RBAC Roles, Casing & NextAuth vs Fintech JWT Boundaries
- **Prisma Schema (`prisma/schema.prisma`)**:
  - Line 40: `model User { ... role String? @default("user") }` (String scalar, default lowercase `"user"`).
  - Line 424: `model TenantMembership { ... role String @default("MEMBER") }` (String scalar, default uppercase `"MEMBER"`).
  - No `enum Role` exists anywhere in `prisma/schema.prisma`.
- **Broken Type Augmentation (`src/next-auth.d.ts:2`)**:
  - Line 2: `import { Role } from "@/generated/prisma/client/index.js";`
  - In `src/generated/prisma/client/index.d.ts`, no symbol named `Role` exists. This causes TypeScript type check instability unless build-time caches are generated.
- **Role Casing Inconsistency**:
  - Lowercase `"user"`: `prisma/schema.prisma:40`, `src/auth.ts:74`, `src/app/actions/auth.ts:46`, `src/lib/api/v1/auth-service.ts:70`.
  - Lowercase `"admin"`: `src/app/operator/page.tsx:34` (`session?.user?.role !== "admin"`), `src/proxy.ts:18`.
  - Uppercase `"ADMIN"` / `"MEMBER"`: `prisma/schema.prisma:424`, `src/lib/api/v1/auth-service.ts:32, 41, 43`, `src/lib/api/v1/invitation-service.ts:7`.
- **The Authentication Boundary Disconnect**:
  - NextAuth is used for browser authentication (cookies, `AUTH_SECRET`).
  - Fintech APIs and the compliance adapter (`src/app/api/compliance/*`) require a Bearer token (`src/lib/api/auth-context.ts:40-50`) verified by `JWT_SECRET`.
  - Frontend client `src/lib/api.ts` never attaches `Authorization: Bearer <token>`.
  - Consequently, any direct browser fetch from dashboard UI to `/api/compliance/*` immediately fails with HTTP 401 (`UNAUTHORIZED: Missing or invalid authorization header`).

#### 1.1.4 Service Authentication (`AI_ASSIST_API_TOKEN`)
- **Env Variable Identification**:
  - `AI_ASSIST_API_KEY` is a conceptual prompt alias. The implemented environment variable in code and tests is `AI_ASSIST_API_TOKEN`.
  - `src/lib/ai-assist/auth.ts:15-19`:
    ```ts
    const apiUrl = optionalEnv("AI_ASSIST_API_URL")?.replace(/\/$/, "");
    const apiToken = optionalEnv("AI_ASSIST_API_TOKEN");
    if (!apiUrl || !apiToken) {
      throw new AiAssistError("AI-ASSIST is not configured", 503, "SERVICE_UNAVAILABLE");
    }
    ```
- **Header Assembly (`src/lib/ai-assist/auth.ts:32-45`)**:
  - Assembles server-to-server headers: `Authorization: Bearer <AI_ASSIST_API_TOKEN>`, `X-Tenant-ID: <tenantId>`, `X-Request-ID: <requestId>`, and optional `Idempotency-Key`.
  - Upstream service token is never forwarded to the browser or logged.

---

### 1.2 Exception Review UI & Routes

#### 1.2.1 Route Status
- `/dashboard/reviews`: **MISSING / DOES NOT EXIST**.
- `/dashboard/reviews/[briefId]`: **MISSING / DOES NOT EXIST**.
- `src/app/dashboard/page.tsx` & `src/app/dashboard/PageClient.tsx`:
  - `PageClient.tsx` is an uncompleted stub (`src/app/dashboard/PageClient.tsx:8`: `return <div>...</div>;`). The original dashboard implementation was left in git commit `8780a9c`.

#### 1.2.2 Compliance Navigation & Layout
- **Navigation Definition (`src/lib/dashboard/navigation.ts:20-29`)**:
  ```ts
  export const NAV_ITEMS: NavItem[] = [
    { label: 'Command Centre', href: '/dashboard', icon: LayoutDashboard, section: 'Core' },
    { label: 'Leads', href: '/dashboard/leads', icon: Users, badge: 12, section: 'Core' },
    { label: 'Audit Engine', href: '/dashboard/audit', icon: ShieldCheck, section: 'Compliance' },
    { label: 'Watchtower', href: '/dashboard/watchtower', icon: Eye, badge: 3, section: 'Compliance' },
    { label: 'Lead Scoring', href: '/dashboard/scoring', icon: Gauge, section: 'AI & Ops' },
    { label: 'WhatsApp AI', href: '/dashboard/whatsapp', icon: MessageCircle, section: 'AI & Ops' },
    { label: 'Intel', href: '/dashboard/competitors', icon: Crosshair, section: 'AI & Ops' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'System' },
  ];
  ```
  - **Gap**: `NAV_ITEMS` under `Compliance` contains `Audit Engine` and `Watchtower`, but is **MISSING** `Exception Review` (`/dashboard/reviews`).
- **Sidebar & Topbar Layout (`src/app/dashboard/layout.tsx`)**:
  - Dynamically renders sections: `Core`, `Compliance`, `AI & Ops`, `System` (`src/app/dashboard/layout.tsx:50-57`).
  - Contains hardcoded user in sidebar footer (`src/app/dashboard/layout.tsx:63-64`):
    `<div className="avatar-name">Stephen</div>`
    `<div className="avatar-role">ARCHITECT</div>`
  - Contains hardcoded subtitle in topbar (`src/app/dashboard/layout.tsx:101`):
    `<div className="page-subtitle">Friday, 1 May 2026 · Owerri, NG</div>`

#### 1.2.3 Existing UI Primitives & State Handling
- Healthy, reusable primitives available in the repository:
  - `DataTable` (`src/components/dashboard/DataTable.tsx`): TanStack table with pagination, row click, empty state.
  - `EmptyState` (`src/components/dashboard/EmptyState.tsx`): Centered card with icon, title, description, action button.
  - `Skeleton` (`src/components/dashboard/Skeleton.tsx`): Standard loading skeleton.
  - `DashboardModal` (`src/components/dashboard/DashboardModal.tsx`): Accessible dialog container.
  - `Badge`, `SeverityBadge`, `StatusBadge` (`src/components/dashboard/*Badge.tsx`).
  - Base UI primitives (`src/components/ui/button.tsx`, `table.tsx`, `card.tsx`, `badge.tsx`).
- Mapping of the 10 required states for Milestone 4:
  1. `loading`: Skeleton component / TanStack table loading state.
  2. `empty`: `EmptyState` component when review queue is empty.
  3. `success`: Populated review queue table and detailed brief view with immutable annotation trail.
  4. `validation failure (400)`: Inline error messages for invalid input (e.g. annotation length outside 1-2000 chars, BVN/NIN patterns).
  5. `401 Unauthorized`: Redirect to `/login`.
  6. `403 Forbidden`: Tenant access denied or lacking compliance permissions.
  7. `404 Not Found`: Brief not found (including cross-tenant indistinguishable 404).
  8. `409 Conflict`: Idempotency key conflict error banner with replay option.
  9. `429 Rate Limited`: Upstream LLM06 policy rate limit / budget trip banner.
  10. `503 Service Unavailable / 504 Timeout`: Upstream AI-ASSIST connection or timeout failure display.

#### 1.2.4 ChatWidget Presence on Sensitive Pages
- **Global Injection (`src/app/layout.tsx:96`)**:
  `<ChatWidget />` is mounted directly in `RootLayout` before `</body>`.
- **Implementation (`src/components/ChatWidget.tsx:19-206`)**:
  The widget contains no pathname checks and unconditionally floats at `bottom: 24px, right: 24px` on every route.
- **Vulnerability**: Exposes public marketing AI chatbot on sensitive compliance pages (`/dashboard/audit`, `/dashboard/watchtower`, `/dashboard/reviews`), risking accidental PII or compliance query leakage into the public chat API (`/api/chat`).

---

### 1.3 Historical Frontend Hypotheses (R5 Investigation)

| # | Hypothesis | Status | File Location & Line Number | Evidence / Quotation |
|---|---|---|---|---|
| 1 | **Role casing / inconsistency** | **CONFIRMED** | `prisma/schema.prisma:40, 424`<br>`src/auth.ts:74`<br>`src/app/actions/auth.ts:46`<br>`src/lib/api/v1/auth-service.ts:32, 41, 70`<br>`src/lib/api/v1/invitation-service.ts:7`<br>`src/app/operator/page.tsx:34`<br>`src/proxy.ts:17`<br>`src/next-auth.d.ts:2` | `prisma.user.role` is String default `"user"`; `tenantMembership.role` is default `"MEMBER"`. `auth.ts` sets `"user"`, `auth-service.ts` sets `"ADMIN"` and `"user"`, `invitation-service` enforces `["ADMIN", "MEMBER"]`. `operator/page.tsx` checks `"admin"`. `proxy.ts` calls `.toLowerCase()` to handle divergence. `next-auth.d.ts` imports non-existent Prisma `Role`. |
| 2 | **NextAuth vs fintech JWT boundary** | **CONFIRMED** | `src/auth.config.ts:48-68`<br>`src/lib/auth.ts:3-8, 53-118`<br>`src/lib/api/auth-context.ts:16-50`<br>`src/lib/api.ts:38-48`<br>`src/app/api/compliance/briefs/route.ts:18` | NextAuth session cookies contain no `tenantId`. Fintech API and compliance routes require `Authorization: Bearer <token>` signed with `JWT_SECRET`. Browser `api` helper never sends Bearer tokens. Any direct frontend call to compliance APIs returns 401. |
| 3 | **Hardcoded identities / location / date** | **CONFIRMED** | `src/app/dashboard/layout.tsx:63-64, 101`<br>`src/app/dashboard/watchtower/page.tsx:37-38, 54, 90`<br>`src/lib/dashboard/data.ts:16-24`<br>`src/app/api/webhooks/twilio/route.ts:25`<br>`src/lib/api/v1/auth-service.ts:68` | Layout hardcodes user `"Stephen"`, role `"ARCHITECT"`, and subtitle `"Friday, 1 May 2026 · Owerri, NG"`. Watchtower hardcodes `"Monday, 5 May 2026 · 08:00 WAT"`. Data files hardcode static 2026 dates. Twilio routes hardcode fallback tenant `"public"`. Auth service falls back to `user.id` as `tenantId`. |
| 4 | **Production-looking secrets / defaults** | **CONFIRMED** | `src/lib/config/index.ts:3-5, 25`<br>`src/auth.ts:73`<br>`src/app/actions/auth.ts:41-48`<br>`src/app/api/webhooks/twilio/route.ts:25` | Default localhost URLs (`localhost:3000`, `localhost:4000`, `localhost:4001`) and hardcoded Paystack egress IPs (`52.31.139.75`, etc.). Sentinel empty string password for OAuth users. Web registration omits tenant/membership. Fallback tenant `"public"`. |
| 5 | **Orphan routes** | **CONFIRMED** | `src/lib/dashboard/navigation.ts:20-29`<br>`src/app/dashboard/analytics/page.tsx`<br>`src/app/dashboard/kyc/page.tsx`<br>`src/app/dashboard/messages/page.tsx`<br>`src/app/dashboard/workflows/page.tsx`<br>`src/app/dashboard/PageClient.tsx:8`<br>`src/app/(marketing)/page.tsx.sovereign.bak`<br>`src/app/page.tsx.legacy.bak`<br>`src/app/api/assistant/route.ts.bak` | Required routes `/dashboard/reviews` and `/dashboard/reviews/[briefId]` are missing. Existing dashboard pages (`analytics`, `kyc`, `messages`, `workflows`) are orphaned from `NAV_ITEMS`. `PageClient.tsx` is an unpopulated placeholder stub. Three `.bak` files pollute the app directory. |
| 6 | **Mock / live data mixing** | **CONFIRMED** | `src/lib/dashboard/data.ts:1-137`<br>`src/app/dashboard/audit/page.tsx:15`<br>`src/app/dashboard/watchtower/page.tsx:5`<br>`src/app/dashboard/leads/page.tsx:5`<br>`src/app/dashboard/scoring/page.tsx:4`<br>`src/app/dashboard/competitors/page.tsx:14`<br>`src/lib/dashboard/live-data.ts:94-151`<br>`src/app/dashboard/analytics/page.tsx:84` | Audit, Watchtower, Leads, Scoring, and Competitors render hardcoded mock constants from `data.ts`. Analytics, KYC, and Messages call live functions in `live-data.ts` hitting `/api/proxy/...`. There is no shared model or data bridge between mock views and live views. |
| 7 | **Environment validation** | **CONFIRMED** | `src/lib/config/validateEnv.ts:2-23`<br>`src/instrumentation.ts:13-14`<br>`src/lib/auth.ts:13-16` | Startup validation in `validateEnv.ts` validates `DATABASE_URL` and `AUTH_SECRET`, but completely ignores `JWT_SECRET`, which is mandatory for all fintech/compliance APIs. It also omits `AI_ASSIST_API_URL` and `AI_ASSIST_API_TOKEN`. |
| 8 | **Compliance authorization** | **CONFIRMED** | `middleware.ts:7-13`<br>`src/auth.config.ts:41-44`<br>`src/app/api/compliance/briefs/route.ts:18`<br>`src/lib/api/auth-context.ts:39-68` | UI compliance pages (`/dashboard/audit`, `/dashboard/watchtower`) allow any authenticated user regardless of role. Compliance API endpoints verify JWT signature and tenant ID, but have zero checks on `auth.context.role` (any role can create briefs or append annotations). |
| 9 | **Runtime mismatch** | **CONFIRMED** | `src/proxy.ts:1-36`<br>`middleware.ts:1-14`<br>`src/auth.config.ts:1-12`<br>`package.json:5-7, 62, 93` | `src/proxy.ts` contains custom middleware logic that Next.js completely ignores in favor of root `middleware.ts`. Edge-safe vs Node.js runtime segregation in NextAuth. Engine specifies Node `24.x` with Next.js `16.3.4` and React `19.2.4`. |
| 10 | **Unsafe generic proxy assumptions** | **CONFIRMED** | `src/app/api/proxy/[[...slug]]/route.ts:5-43`<br>`src/lib/dashboard/live-data.ts:95, 103, 110, 126, 139, 146, 150` | `/api/proxy/[[...slug]]` blindly forwards requests to `BACKEND_API_URL` without ANY authentication, authorization, or tenant checks. Frontend assumed an external backend, ignoring the fact that `/api/v1/...` routes already exist natively in Next.js. R3 explicitly forbids routing AI-ASSIST through generic proxy. |

---

## 2. Logic Chain

1. **Step 1 — Auth Inspection**:
   - We observed that NextAuth v5 session callbacks store `{ id, role }` and sign with `AUTH_SECRET` into HTTP cookies.
   - We observed that `src/lib/auth.ts` signs a distinct HMAC-SHA256 JWT containing `{ sub, tenantId, role, email }` using `JWT_SECRET`.
   - We traced `requireAuthContext` in `src/lib/api/auth-context.ts` and confirmed it checks only `request.headers.get("authorization")`.
   - **Deduction**: The frontend client logged in via NextAuth cannot authenticate to any API guarded by `requireAuthContext`, including all `/api/compliance/*` routes.

2. **Step 2 — Tenancy Inspection**:
   - We observed that `User` in `prisma/schema.prisma` has no direct relationship to `Tenant`. Tenancy is represented exclusively via `TenantMembership`.
   - In `src/app/actions/auth.ts`, user registration creates a `User` but does not create `Tenant` or `TenantMembership`.
   - In `src/auth.ts`, credentials and OAuth sign-in do not query `TenantMembership`.
   - In `src/lib/api/v1/auth-service.ts`, registration creates all three entities, but password login falls back to `user.id` as `tenantId` if membership is missing.
   - **Deduction**: NextAuth users are tenant-blind. Authenticated server boundaries must derive authoritative tenant identity from `TenantMembership` via the verified session user ID, never trusting browser parameters.

3. **Step 3 — Exception Review UI & Navigation Inspection**:
   - We searched the repository for `/dashboard/reviews` and found zero matching routes or files.
   - We checked `src/lib/dashboard/navigation.ts` and confirmed that `Exception Review` is absent from `Compliance` navigation.
   - We cross-referenced `teamwork_preview_spec_miner_contract_1/handoff.md` and verified `CONTRACT_MISMATCH-1`: Upstream provides `GET /v1/review-queue`, but the local adapter client (`client.ts`) and API routes (`src/app/api/compliance/`) lack queue listing functionality.
   - **Deduction**: Building `/dashboard/reviews` requires two synchronized additions: (1) adding the queue listing client method and API route to the adapter, and (2) creating the Next.js review queue page and detail page with the 10 required UI states.

4. **Step 4 — Global Component & Leakage Inspection**:
   - We checked `src/app/layout.tsx` line 96 and found `<ChatWidget />` mounted globally.
   - We checked `src/components/ChatWidget.tsx` and found no route filtering.
   - **Deduction**: Public marketing chat is rendered on sensitive compliance and dashboard surfaces. It must be conditionally excluded from `/dashboard/*`, `/admin/*`, and `/operator/*`.

5. **Step 5 — Hypothesis Verification**:
   - All 10 R5 historical hypotheses were verified against actual repository source code.
   - Every single hypothesis was **CONFIRMED** with exact line numbers and architectural evidence.

---

## 3. Caveats

- **Passkey Containment**: As established in `docs/engineering/DECISIONS.md`, passkey sign-in remains contained (`src/app/api/auth/verify-login/route.ts` returns 503). This investigation focused strictly on password, OAuth, and NextAuth session mechanics.
- **Node 24 Environment**: All assertions reflect the Node 24 runtime and Next.js 16 environment specified in `package.json`.
- **Read-Only Scope**: In strict accordance with the dispatch instructions, no repository source files were modified during this investigation.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Milestone 3 (Adapter & Auth) Recommendations for `ADAPTER_ENGINEER` & `AUTH_TENANT_SECURITY`
1. **Server Auth Boundary Bridge**:
   - Update `src/app/api/compliance/*` route handlers (or create a unified auth boundary helper) to accept **BOTH**:
     - Bearer JWT (for external fintech API clients via `requireAuthContext`).
     - NextAuth session (for dashboard browser sessions via `await auth()`).
   - When authenticated via NextAuth session:
     - Derive `userId` from `session.user.id`.
     - Resolve authoritative `tenantId` by querying `prisma.tenantMembership.findFirst({ where: { userId } })`. If no membership exists, fail closed with HTTP 403 (`TENANT_ACCESS_DENIED`).
     - Verify RBAC role: Ensure user role is authorized for compliance reviews (`ADMIN` or compliance role).
2. **Resolve `CONTRACT_MISMATCH-1`**:
   - Add `ReviewQueueSummary`, `ReviewQueueListResponse`, and `ListReviewsParams` to `src/lib/ai-assist/types.ts`.
   - Implement `listComplianceReviews(params: ListReviewsParams): Promise<ReviewQueueListResponse>` in `src/lib/ai-assist/client.ts`.
   - Create `src/app/api/compliance/reviews/route.ts` implementing `GET` with `limit`, `offset`, and `state` query parameters.
   - Update `tests/api/compliance.test.ts` line 256 to allow `"reviews/route.ts"`.
3. **Resolve `CONTRACT_MISMATCH-2`**:
   - In `src/lib/ai-assist/errors.ts:mapUpstreamStatus`, map HTTP 400 to `{ status: 400, code: "INVALID_BODY" }` instead of falling through to 502 Bad Gateway.
4. **Environment Validation**:
   - Add `JWT_SECRET` to `required` environment variables in `src/lib/config/validateEnv.ts`.

### 4.2 Milestone 4 (Exception Review UI) Recommendations for `FRONTEND_REVIEW_ENGINEER`
1. **Navigation Update**:
   - Add `{ label: 'Exception Review', href: '/dashboard/reviews', icon: ClipboardCheck, section: 'Compliance' }` to `NAV_ITEMS` in `src/lib/dashboard/navigation.ts`.
2. **Route Implementation**:
   - Create `src/app/dashboard/reviews/page.tsx` (Review Queue list).
   - Create `src/app/dashboard/reviews/[briefId]/page.tsx` (Brief detail and operator annotation).
3. **10-State Coverage**:
   - Implement all 10 required states: `loading` (Skeleton), `empty` (`EmptyState`), `success` (Table/Detail), `validation failure` (inline 400), `401` (redirect to login), `403` (tenant/role forbidden), `404` (not found), `409` (idempotency conflict), `429` (LLM06 budget trip), `503/504` (service unavailable/timeout).
4. **ChatWidget Containment**:
   - In `src/components/ChatWidget.tsx` (or `src/app/layout.tsx`), hide `<ChatWidget />` on routes matching `/dashboard/*`, `/admin/*`, or `/operator/*` using `usePathname()`.
5. **Dashboard Command Centre Fix**:
   - Restore the full dashboard implementation in `src/app/dashboard/PageClient.tsx` from commit `8780a9c`, replacing the placeholder stub.
6. **Hardcoded Strings Cleanup**:
   - Replace hardcoded avatar `"Stephen"` and `"ARCHITECT"` in `src/app/dashboard/layout.tsx` with dynamic session values (`session.user.name`, `session.user.role`).
   - Replace hardcoded date/location `"Friday, 1 May 2026 · Owerri, NG"` with current dynamic date formatting.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Role & Schema Mismatch**:
   ```bash
   grep -n "role" prisma/schema.prisma
   grep -n "Role" src/next-auth.d.ts
   grep -n "role" src/auth.ts src/app/actions/auth.ts src/lib/api/v1/auth-service.ts src/proxy.ts
   ```
2. **Verify NextAuth vs Fintech JWT Disconnect**:
   ```bash
   cat src/auth.config.ts
   cat src/lib/api/auth-context.ts
   cat src/app/api/compliance/briefs/route.ts
   ```
3. **Verify Missing Exception Review Routes & Navigation**:
   ```bash
   ls -la src/app/dashboard/reviews 2>&1
   grep -n "Compliance" src/lib/dashboard/navigation.ts
   ```
4. **Verify ChatWidget Global Placement**:
   ```bash
   grep -n "ChatWidget" src/app/layout.tsx
   cat src/components/ChatWidget.tsx | head -n 30
   ```
5. **Run Existing Focused Auth & Adapter Tests**:
   ```bash
   npx vitest run tests/ai-assist-client.test.ts tests/api/compliance.test.ts tests/auth-credentials.test.ts tests/passkey-login.test.ts
   ```
   *Result*: 39 passed cleanly.

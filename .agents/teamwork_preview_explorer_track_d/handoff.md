# Track D: End-to-End Customer Journey Inspection & Verification Report

- **Agent**: `teamwork_preview_explorer` (Track D: E2E Customer Journey)
- **Repository**: `SHADOWSPARK-TECHNOLOGIES/shadowspark-production`
- **Worktree**: `/home/moronto/AgentOps/worktrees/shadowspark-agy`
- **Branch**: `agent/agy-production-readiness` (commit `40ba78e`)
- **Date**: 2026-09-18T11:28:45Z
- **Target Deliverable**: `.agents/teamwork_preview_explorer_track_d/handoff.md`

---

## 1. Observation

Direct code and repository evidence collected across the end-to-end customer journey, WhatsApp messaging flows, and E2E test suites:

### 1.1 Complete Customer Journey Mapping

#### 1. Visitor Experience & Public Marketing Surfaces
- **Landing Page (`src/app/(marketing)/page.tsx`)**:
  - Renders modular landing components: `Hero`, `WhatWeDo`, `Flagship`, `HowWeWork`, `LiveDeployment`, `WhyShadowspark`, `Services`, `Stack`, `Contact`, `Footer`.
  - Primary Hero CTAs (`src/components/landing/Hero.tsx`, lines 25–40):
    - "See What We've Built" → anchor `#flagship`.
    - "Start a Project" → `/contact`.
- **Public Pricing Page (`src/app/(marketing)/pricing/page.tsx`)**:
  - Displays 3 sovereign tiers (lines 26–77): Starter (₦150,000/mo), Professional (₦450,000/mo), Enterprise (Custom).
  - Starter & Professional CTAs route to `/checkout/new`. Enterprise CTA routes to `/contact`.
  - Pricing FAQ (lines 84–87) specifies: *"We accept all major Nigerian bank transfers, Paystack payments, and international wire transfers."*
- **Global Chat Widget (`src/components/ChatWidget.tsx` & `src/app/layout.tsx`)**:
  - Mounted globally in `RootLayout` (`src/app/layout.tsx:96`).
  - Strict UI containment verified: lines 68–75 explicitly hide the widget on sensitive surfaces:
    ```tsx
    if (
      pathname &&
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/operator"))
    ) {
      return null;
    }
    ```
  - Sends user messages to `POST /api/chat`.

#### 2. Demo & Contact Ingestion
- **Contact Form Component (`src/components/landing/Contact.tsx`)**:
  - Rendered on landing `#contact` and dedicated `/contact/page.tsx`.
  - Collects `name`, `company`, `email`, `whatsapp`, `message`.
  - Submits client payload to `POST /api/contact`.
  - **Identified Gap / Placeholder Artifacts**: Lines 72, 143, 150 contain placeholder values with unaddressed operator TODOs:
    - Email: `hello@shadowspark.ng` (`// TODO: needs real value from operator`)
    - WhatsApp link: `https://wa.me/234XXXXXXXXXX` (`// TODO: needs real value from operator`)
- **Contact API Handler (`src/app/api/contact/route.ts`)**:
  - Lines 8–10: Validates required fields (`name`, `email`, `message`); returns HTTP 400 on missing fields.
  - Lines 14–27: Persists contact inquiry to PostgreSQL via `prisma.lead.upsert` with `intent: "CONTACT_FORM"` and `status: "NEW"`, ensuring leads are never lost.
  - Lines 28–34: Logs system audit event via `prisma.systemEvent.create({ data: { type: "CONTACT_INQUIRY", ... } })`.
  - Lines 39–48: Graceful fallback when `RESEND_API_KEY` is unset: logs receipt and returns HTTP 200 with `{ success: true, degraded: true, message: "Received. We will get back to you within 48 hours." }`.
  - Lines 50–67: Sends transactional email via Resend when configured.

#### 3. Authentication & Account Access
- **Login Route (`src/app/(auth)/login/page.tsx`)**:
  - Supports dual authentication modes: Password and Passkey.
  - Password login invokes server action `loginUser` (`src/app/actions/auth.ts:60`), which authenticates against bcrypt hashes and delegates session issuance to NextAuth credentials provider (`src/auth.ts`).
  - Roles are normalized to lowercase (`user`, `admin`, `compliance`) across NextAuth JWT and session callbacks.
  - Passkey login toggle is visible, but the backend endpoint `POST /api/auth/verify-login/route.ts` strictly fails closed with HTTP 503:
    ```json
    { "error": "Passkey sign-in is temporarily unavailable. Use password or OAuth sign-in." }
    ```
    This behavior is independently verified by `tests/passkey-login.test.ts`.
- **Registration Route (`src/app/(auth)/register/page.tsx`)**:
  - Invokes `registerUser` in `src/app/actions/auth.ts:20`.
  - **Identified Gap**: `registerUser` creates a `User` record with `role: "user"` in PostgreSQL, but does NOT create a `Tenant` or `TenantMembership`.
  - In contrast, `src/lib/api/v1/auth-service.ts` transactionally creates `User` + `Tenant` + `TenantMembership` (lines 30–45). Consequently, users registering via the web form have no tenant membership and cannot access compliance workflows without operator intervention.

#### 4. Dashboard & Navigation Experience
- **Dashboard Root (`src/app/dashboard/page.tsx` & `src/app/dashboard/layout.tsx`)**:
  - App shell with responsive sidebar navigation (`src/lib/dashboard/navigation.ts`):
    - Core: Command Centre (`/dashboard`), Leads (`/dashboard/leads`)
    - Compliance: Audit Engine (`/dashboard/audit`), Watchtower (`/dashboard/watchtower`), Exception Review (`/dashboard/reviews`)
    - AI & Ops: Lead Scoring (`/dashboard/scoring`), WhatsApp AI (`/dashboard/whatsapp`), Intel (`/dashboard/competitors`)
    - System: Settings (`/dashboard/settings`)
  - Session topbar asynchronously fetches `/api/auth/session` to render the user's name and normalized uppercase role banner (e.g. "COMPLIANCE", "OPERATOR").

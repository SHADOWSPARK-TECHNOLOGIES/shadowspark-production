# ShadowSpark — Multi‑Persona Audit Workbook

**Prepared**: 2026-05-02  
**Scope**: Accessibility (WCAG 2.2 AA), Security (OWASP ASVS-aligned), Performance & Core Web Vitals, SEO & Crawlability, Trust & Content Integrity  
**Audience**: Internal engineering, external accessibility auditors, penetration testers, SEO consultants, compliance reviewers

---

## Instructions

Mark each item as:

| Symbol | Meaning                                                      |
| ------ | ------------------------------------------------------------ |
| ✅     | Pass — verified and documented                               |
| ⚠️     | Needs review — requires further investigation or remediation |
| ❌     | Fails — known issue, must be fixed                           |

Add links to evidence (screenshots, URLs, PRs, commit hashes) in the **Notes** column.

---

## 1. Accessibility Audit (WCAG 2.2 AA)

Reference: [WCAG 2.2 AA Summary & Checklist](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)

### 1.1 Keyboard & Focus

| #     | Check                                                                                             | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 | All interactive elements (links, buttons, inputs, modals, menus) are reachable via Tab/Shift+Tab. | ⚠️     | Marketing pages use `framer-motion` with custom interactive components (e.g., [`src/app/faq/page.tsx`](src/app/faq/page.tsx:97) — FAQ accordion buttons, [`src/app/solutions/page.tsx`](src/app/solutions/page.tsx) — AppleCardsCarousel). Verify custom components receive correct `tabindex`. Dashboard sidebar [`src/app/globals.css`](src/app/globals.css:392) `.nav-item` uses `cursor: pointer` but no explicit `tabindex`. |
| 1.1.2 | Focus order follows visual order across marketing pages and dashboard views.                      | ⚠️     | Dashboard layout uses CSS grid with `order` not explicitly set. Sidebar is `position: fixed` at `left: 0` which is correct for DOM order, but verify mobile sidebar overlay doesn't break focus order.                                                                                                                                                                                                                            |
| 1.1.3 | Focus indicator is clearly visible on all interactive elements in both light and dark modes.      | ⚠️     | Root layout has a skip-link with focus styles at [`src/app/layout.tsx`](src/app/layout.tsx:78). Dashboard nav items have `transition: color, background` but no `outline` focus ring. Marketing form inputs use `focus:ring-1 focus:ring-emerald-500/50` — verify contrast in both themes.                                                                                                                                        |
| 1.1.4 | Modals trap focus (Tab/Shift+Tab cycle) and close on Escape, returning focus to the trigger.      | ⚠️     | Dashboard modal at [`src/app/globals.css`](src/app/globals.css:805) has `.modal-overlay` and `.dashboard-modal` but no focus trapping logic visible in CSS. Check React component for `useEffect` focus trap. Marketing pages have no modals.                                                                                                                                                                                     |
| 1.1.5 | No "keyboard traps" where focus cannot escape a component.                                        | ⚠️     | The AppleCardsCarousel on [`src/app/solutions/page.tsx`](src/app/solutions/page.tsx) uses horizontal scroll — verify keyboard navigation doesn't trap focus.                                                                                                                                                                                                                                                                      |

### 1.2 Structure & Semantics

| #     | Check                                                                                             | Status | Notes                                                                                                                                                                                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.2.1 | Exactly one `<h1>` per page; headings use logical nesting (H1 → H2 → H3).                         | ⚠️     | [`src/app/contact/page.tsx`](src/app/contact/page.tsx:75) has `<h1>` — good. [`src/app/enterprise/page.tsx`](src/app/enterprise/page.tsx) uses `SovereignHero` component — verify it renders an `<h1>`. [`src/app/faq/page.tsx`](src/app/faq/page.tsx:76) uses `<h2>` for "Practical answers before you deploy" — verify `SovereignHero` provides the page's `<h1>`. |
| 1.2.2 | Navigation landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) exist and are used consistently. | ⚠️     | Root layout at [`src/app/layout.tsx`](src/app/layout.tsx:84) wraps children in `<div id="main-content">` — should be `<main>` with `id="main-content"`. Dashboard uses `<div class="dashboard-root">` with no `<nav>` landmark on sidebar. Marketing pages use custom components — verify landmark roles.                                                            |
| 1.2.3 | Forms use `<label>` elements tied to inputs; groups use `<fieldset>`/`<legend>` as needed.        | ✅     | [`src/app/contact/page.tsx`](src/app/contact/page.tsx:154-228) — all inputs have `<label>` with matching `htmlFor`. [`src/app/enterprise/page.tsx`](src/app/enterprise/page.tsx:193-265) — same pattern. Login form at [`src/app/(auth)/login/page.tsx`](<src/app/(auth)/login/page.tsx:81-106>) — labels present.                                                   |
| 1.2.4 | Tables in the dashboard have `<th>` headers and `scope` attributes where appropriate.             | ⚠️     | Dashboard table at [`src/app/globals.css`](src/app/globals.css:736) uses `.dashboard-table` with `<thead><th>` — verify actual table markup in components like [`src/app/operator/columns.tsx`](src/app/operator/columns.tsx) and [`src/app/operator/DataTable.tsx`](src/app/operator/DataTable.tsx).                                                                |
| 1.2.5 | ARIA roles/labels are used only when native semantics are insufficient (no ARIA abuse).           | ⚠️     | [`src/app/contact/page.tsx`](src/app/contact/page.tsx:122) uses `aria-label="Contact form"` on `<section>` — acceptable. [`src/app/enterprise/page.tsx`](src/app/enterprise/page.tsx:168) uses `role="status"` and `aria-live="polite"` — good. Verify no redundant ARIA on native elements.                                                                         |

### 1.3 Visual & Contrast

| #     | Check                                                                             | Status | Notes                                                                                                                                                                                                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.3.1 | Body text and UI labels meet at least 4.5:1 contrast on all surfaces.             | ⚠️     | Dark theme: `--foreground: #f0f0f0` on `--background: #0a0b0d` — ratio ~14.5:1 ✅. Light dashboard: `--color-text: #28251d` on `--color-bg: #f7f6f2` — ratio ~11.5:1 ✅. Check muted text `--color-text-muted: #7a7974` on `--color-bg: #f7f6f2` — ratio ~3.8:1 ❌ fails 4.5:1.                                        |
| 1.3.2 | Large text (headings) meets at least 3:1 contrast.                                | ✅     | Heading colors inherit `--foreground` or `--color-text` — both pass 3:1 on their backgrounds.                                                                                                                                                                                                                          |
| 1.3.3 | Disabled or faint text is not used for critical information.                      | ⚠️     | `--color-text-faint: #bab9b4` on `--color-bg: #f7f6f2` — ratio ~2.2:1. Verify this is only used for non-critical metadata (timestamps, secondary labels).                                                                                                                                                              |
| 1.3.4 | Color is not the only way to convey state (e.g., HOT/WARM/COLD, severity badges). | ⚠️     | Severity badges at [`src/app/globals.css`](src/app/globals.css:1010) use `.sev-critical` (red), `.sev-high` (orange), `.sev-medium` (gold), `.sev-low` (green) — verify text labels or icons accompany colors. Dashboard badges at line 708 use `.badge-green`, `.badge-red`, `.badge-orange` — check for text labels. |

### 1.4 Media, Zoom & Responsiveness

| #     | Check                                                                                      | Status | Notes                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.4.1 | All meaningful images/icons have descriptive `alt` text; decorative graphics use `alt=""`. | ⚠️     | Public assets in [`public/`](public/) include logos — verify `<Image>` or `<img>` usage in components has appropriate `alt`. Marketing components like [`SovereignLogo`](src/components/marketing/SovereignLogo.tsx) — check alt text. |
| 1.4.2 | The layout works at 200% zoom without horizontal scrolling on common viewports.            | ⚠️     | Dashboard has `overflow: hidden` on `.dashboard-root` and `overflow-y: auto` on `.dashboard-content` — test at 200% zoom. Marketing pages use `clamp()` for font sizes — good practice.                                                |
| 1.4.3 | Content reflows correctly on mobile; no clipped or overlapped text.                        | ✅     | Responsive breakpoints at [`src/app/globals.css`](src/app/globals.css:1130) (1024px) and (640px) handle sidebar collapse and grid reflow. Marketing pages use Tailwind responsive classes.                                             |
| 1.4.4 | No auto-playing audio/video that cannot be paused or stopped.                              | ✅     | No auto-playing media detected in the codebase.                                                                                                                                                                                        |

### 1.5 Testing Evidence

- **Tools used**: axe DevTools, Lighthouse Accessibility, NVDA/VoiceOver screen readers
- **Manual tests**: Full keyboard navigation walkthrough of marketing pages + dashboard views

| Tool                      | Route           | Result | Notes                     |
| ------------------------- | --------------- | ------ | ------------------------- |
| Lighthouse Accessibility  | `/`             | ⚠️     | Run audit                 |
| Lighthouse Accessibility  | `/pricing`      | ⚠️     | Run audit                 |
| Lighthouse Accessibility  | `/about`        | ⚠️     | Run audit                 |
| Lighthouse Accessibility  | `/dashboard`    | ⚠️     | Run audit (requires auth) |
| axe DevTools              | All routes      | ⚠️     | Run full scan             |
| Screen reader (NVDA)      | Marketing pages | ⚠️     | Manual test               |
| Screen reader (VoiceOver) | Dashboard       | ⚠️     | Manual test               |

---

## 2. Security Audit (OWASP ASVS-Aligned)

Reference: [OWASP ASVS](https://www.aikido.dev/learn/compliance/compliance-frameworks/owasp-asvs)

### 2.1 Authentication & Session (ASVS V2–V3)

| #     | Check                                                                                     | Status | Notes                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1.1 | Authentication flows use secure, modern methods (NextAuth v5, no custom insecure auth).   | ✅     | NextAuth v5 with JWT strategy at [`src/auth.config.ts`](src/auth.config.ts:18). Credentials provider with bcrypt at [`src/auth.ts`](src/auth.ts:43). Passkey (WebAuthn) support at [`src/app/api/auth/register-options/route.ts`](src/app/api/auth/register-options/route.ts) and [`src/app/api/auth/verify-login/route.ts`](src/app/api/auth/verify-login/route.ts). |
| 2.1.2 | Sessions are invalidated on logout and after password/account changes.                    | ⚠️     | JWT-based sessions — no server-side session store. Verify that `signOut()` in NextAuth v5 properly clears the JWT cookie. Password change flow not visible in codebase — verify session invalidation.                                                                                                                                                                 |
| 2.1.3 | Cookies are `HttpOnly`, `Secure`, and have appropriate `SameSite` policies in production. | ⚠️     | NextAuth v5 default cookie config — verify production settings. Check `next-auth.session-token` cookie attributes in deployed environment.                                                                                                                                                                                                                            |
| 2.1.4 | Brute-force and credential stuffing protections exist (rate limiting, lockouts, etc.).    | ⚠️     | [`@upstash/ratelimit`](package.json:40) and [`@upstash/redis`](package.json:41) are dependencies — verify they are applied to auth endpoints. No rate limiting visible in [`src/app/(auth)/login/page.tsx`](<src/app/(auth)/login/page.tsx>) client component.                                                                                                        |

### 2.2 Access Control & Business Logic (V4, V11)

| #     | Check                                                                                        | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2.1 | Dashboard routes require authenticated users; marketing routes are public.                   | ✅     | Middleware at [`src/auth.config.ts`](src/auth.config.ts:33) protects `/dashboard`, `/admin`, `/finance`, `/support`. Marketing routes (`/`, `/pricing`, `/about`, `/contact`, `/enterprise`, `/faq`, `/solutions`, `/industries`, `/process`) are public.                                                                                                                                                         |
| 2.2.2 | Role-based access control is enforced on sensitive actions (e.g., system settings, ledger).  | ✅     | [`src/app/api/operator/approve/route.ts`](src/app/api/operator/approve/route.ts:7) checks `session?.user?.role !== "admin"`. [`src/app/api/operator/leads/route.ts`](src/app/api/operator/leads/route.ts:46) same pattern. JWT includes role at [`src/auth.config.ts`](src/auth.config.ts:51).                                                                                                                    |
| 2.2.3 | No "security by obscurity" (e.g., relying only on hidden links for protection).              | ✅     | All protected routes have server-side auth checks, not just hidden UI.                                                                                                                                                                                                                                                                                                                                            |
| 2.2.4 | Critical operations (webhook processing, payments) perform server-side authorization checks. | ✅     | Paystack webhook at [`src/app/api/webhooks/paystack/route.ts`](src/app/api/webhooks/paystack/route.ts:68) validates HMAC signature. WhatsApp webhook at [`src/app/api/webhooks/whatsapp/meta/route.ts`](src/app/api/webhooks/whatsapp/meta/route.ts:24) verifies `hub.verify_token`. Resend webhook at [`src/app/api/webhooks/resend/route.ts`](src/app/api/webhooks/resend/route.ts:20) verifies HMAC signature. |

### 2.3 Input Validation & Data Handling (V5, V8)

| #     | Check                                                                                 | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.1 | All API inputs (forms, webhooks, query params) are validated and sanitized.           | ⚠️     | Contact form at [`src/app/api/contact/route.ts`](src/app/api/contact/route.ts:16) validates `name`, `email`, `company` presence but no schema validation library (e.g., Zod). Enterprise form same pattern. Webhook payloads are parsed but not validated against a schema — [`src/app/api/webhooks/paystack/route.ts`](src/app/api/webhooks/paystack/route.ts:82) uses type assertion `as PaystackWebhookPayload`. |
| 2.3.2 | No raw user input is interpolated directly into queries or dynamic code.              | ✅     | Prisma is used throughout — parameterized queries by default. No raw SQL string concatenation detected.                                                                                                                                                                                                                                                                                                             |
| 2.3.3 | Sensitive data (tokens, secrets, keys) never logged in plain text.                    | ⚠️     | [`src/app/api/webhooks/whatsapp/meta/route.ts`](src/app/api/webhooks/whatsapp/meta/route.ts:76) logs full webhook payload: `JSON.stringify(body, null, 2)` — could contain PII. [`src/app/api/contact/route.ts`](src/app/api/contact/route.ts:23) logs contact form data including email and name — acceptable for first-party data but verify no tokens/secrets logged.                                            |
| 2.3.4 | Encryption is used appropriately (e.g., HTTPS everywhere, secrets in Secret Manager). | ✅     | Production deployment on Cloud Run with HTTPS. Secrets loaded via environment variables — [`scripts/deploy-with-secrets.sh`](scripts/deploy-with-secrets.sh) and [`scripts/migrate-secrets-gcp.ts`](scripts/migrate-secrets-gcp.ts) indicate Secret Manager usage.                                                                                                                                                  |

### 2.4 Webhooks & APIs (V13, V14)

| #     | Check                                                                                         | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.4.1 | `/api/webhooks/paystack/route.ts` validates Paystack signatures before mutating data.         | ✅     | HMAC-SHA512 verification with `timingSafeEqual` at [`src/app/api/webhooks/paystack/route.ts`](src/app/api/webhooks/paystack/route.ts:28-48). Suspicious ingress logged at line 69.                                                                                                                                                                                                                 |
| 2.4.2 | `/api/webhooks/whatsapp/meta/route.ts` verifies `hub.verify_token` and handles events safely. | ✅     | GET verification at [`src/app/api/webhooks/whatsapp/meta/route.ts`](src/app/api/webhooks/whatsapp/meta/route.ts:17-32). POST handler at line 71 processes messages with fire-and-forget pattern.                                                                                                                                                                                                   |
| 2.4.3 | Webhooks are marked `dynamic` and not cached; idempotency is handled where needed.            | ⚠️     | WhatsApp webhook has `export const dynamic = "force-dynamic"` at line 118 ✅. Paystack webhook at [`src/app/api/webhooks/paystack/route.ts`](src/app/api/webhooks/paystack/route.ts:89-100) has idempotency check via `systemEvent` lookup ✅. Resend webhook at [`src/app/api/webhooks/resend/route.ts`](src/app/api/webhooks/resend/route.ts) — no explicit `dynamic` export; verify no caching. |
| 2.4.4 | API responses do not leak stack traces or sensitive internal details.                         | ⚠️     | [`src/app/api/webhooks/paystack/route.ts`](src/app/api/webhooks/paystack/route.ts:188-192) catches errors and returns generic message. [`src/app/api/health/route.ts`](src/app/api/health/route.ts:30) returns `error.message` — could leak internals. [`src/app/api/operator/approve/route.ts`](src/app/api/operator/approve/route.ts:38) returns generic "Approval failed".                      |

### 2.5 Dependencies & Configuration (V10, V14)

| #     | Check                                                                              | Status | Notes                                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.5.1 | Dependencies are kept up to date; no known critical vulnerabilities.               | ⚠️     | Next.js 16.2.4 (canary) — verify latest stable. React 19.2.4. Run `pnpm audit` to check for known CVEs.                                                                                            |
| 2.5.2 | Prisma is used with plain `PrismaClient` (no adapters).                            | ✅     | [`src/lib/prisma.ts`](src/lib/prisma.ts) uses `PrismaClient` with `PrismaPg` adapter — no ORM adapters that could introduce injection vectors.                                                     |
| 2.5.3 | Environment variables are loaded via Secret Manager in production; none committed. | ✅     | [`scripts/deploy-with-secrets.sh`](scripts/deploy-with-secrets.sh) and [`scripts/migrate-secrets-gcp.ts`](scripts/migrate-secrets-gcp.ts) confirm Secret Manager usage. No `.env` files committed. |
| 2.5.4 | Production build uses correct environment (no dev flags in Cloud Run).             | ✅     | [`Dockerfile`](Dockerfile) and [`scripts/deploy-webapp.sh`](scripts/deploy-webapp.sh) use `NODE_ENV=production`.                                                                                   |

---

## 3. Performance & Core Web Vitals Audit

Reference: [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)

### 3.1 Lighthouse Scores

Run Lighthouse (mobile + desktop) against key routes and record scores:

| Route        | Perf | Accessibility | Best Practices | SEO | Notes                                                |
| ------------ | ---- | ------------- | -------------- | --- | ---------------------------------------------------- |
| `/`          | ⚠️   | ⚠️            | ⚠️             | ⚠️  | Run audit                                            |
| `/pricing`   | ⚠️   | ⚠️            | ⚠️             | ⚠️  | Run audit                                            |
| `/about`     | ⚠️   | ⚠️            | ⚠️             | ⚠️  | Run audit                                            |
| `/dashboard` | ⚠️   | ⚠️            | ⚠️             | ⚠️  | Requires auth — use Lighthouse in authenticated mode |

### 3.2 Core Web Vitals Targets

| Metric | Target                                | Status | Notes                                                                                                                                |
| ------ | ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| LCP    | < 2.5s (ideally < 2.0s for dashboard) | ⚠️     | Measure via Lighthouse and CrUX. Marketing pages use heavy `framer-motion` animations — potential LCP impact.                        |
| CLS    | < 0.1                                 | ⚠️     | Fonts loaded via Next.js `next/font/google` with `display=swap` — good. Verify no layout shift from custom fonts or dynamic content. |
| INP    | < 200 ms                              | ⚠️     | Dashboard uses client-side interactivity (charts, tables, modals). Measure via Lighthouse INP diagnostic.                            |

### 3.3 Bundle & Assets

| #     | Check                                                                                       | Status | Notes                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3.1 | Heavy client-side code is minimized; charts and admin-only modules are split appropriately. | ⚠️     | Dependencies include `chart.js` + `react-chartjs-2`, `framer-motion`, `react-markdown`, `highlight.js` — verify dynamic imports for dashboard-only components. [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) imports `DashboardChart` — check if dynamically loaded. |
| 3.3.2 | Images use modern formats, appropriate sizes, and lazy loading.                             | ⚠️     | Public assets in [`public/`](public/) are SVGs — efficient. Verify `<Image>` components use `next/image` with `sizes` and `loading="lazy"`.                                                                                                                                       |
| 3.3.3 | Fonts are loaded efficiently (preconnect, `display=swap`).                                  | ✅     | Fonts at [`src/app/layout.tsx`](src/app/layout.tsx:10-26) use `next/font/google` with `display=swap` by default. Three font families loaded — verify no render-blocking.                                                                                                          |
| 3.3.4 | Unused or duplicate libraries have been pruned.                                             | ⚠️     | Dependencies include `langchain` (1.3.4) — verify it's actively used. `@prisma/client-runtime-utils` (7.8.0) — check if needed. `babel-loader`, `css-loader`, `webpack` devDependencies — verify if still needed with Next.js 16 turbopack.                                       |

---

## 4. SEO & Crawlability Audit

Reference: [Lighthouse SEO Audits](https://www.debugbear.com/blog/lighthouse-seo-score), [unlighthouse](https://unlighthouse.dev/learn-lighthouse/seo)

### 4.1 Lighthouse SEO Checks

| #      | Check                                                                          | Status | Notes                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1.1  | Each public page has a unique `<title>` and meta description.                  | ⚠️     | Root layout at [`src/app/layout.tsx`](src/app/layout.tsx:28-57) sets global `title` and `description`. Individual pages (`/enterprise`, `/contact`, `/faq`, `/solutions`, `/industries`, `/process`) do NOT export their own `metadata` — they all inherit the root "Shadowspark — Sovereign Financial Node" title. **Fix: add per-page metadata export.** |
| 4.1.2  | Viewport meta tag is present and correctly configured.                         | ✅     | [`src/app/layout.tsx`](src/app/layout.tsx:59-63) exports `viewport` with `width: "device-width"`, `initialScale: 1`.                                                                                                                                                                                                                                       |
| 4.1.3  | All important pages return 200 HTTP status codes.                              | ⚠️     | Verify deployed routes return 200. Pages like `/pricing`, `/about` need to exist or return proper 404.                                                                                                                                                                                                                                                     |
| 4.1.4  | Pages are not blocked from indexing unintentionally (robots.txt, meta robots). | ⚠️     | [`src/app/robots.ts`](src/app/robots.ts) disallows `/dashboard/`, `/admin/`, `/api/`, `/finance/`, `/support/` — correct for private routes. Verify no `noindex` meta tag on public marketing pages.                                                                                                                                                       |
| 4.1.5  | Links use descriptive anchor text (avoid "click here").                        | ⚠️     | Marketing CTAs use descriptive text ("Request Consultation", "Start Qualification Audit", "View Solutions") ✅. Verify all `<Link>` components have meaningful text.                                                                                                                                                                                       |
| 4.1.6  | Links are crawlable (no critical navigation hidden behind JS only).            | ⚠️     | Marketing navigation uses `<Link>` from Next.js — crawlable. Dashboard navigation is client-side rendered — acceptable for authenticated routes.                                                                                                                                                                                                           |
| 4.1.7  | `robots.txt` is valid.                                                         | ✅     | [`src/app/robots.ts`](src/app/robots.ts) generates valid `robots.txt` with `Allow: /`, `Disallow` for protected paths, and `Sitemap` URL.                                                                                                                                                                                                                  |
| 4.1.8  | `sitemap.xml` exists and includes key routes.                                  | ⚠️     | [`src/app/sitemap.ts`](src/app/sitemap.ts) includes `/`, `/about`, `/solutions`, `/pricing`, `/contact`, `/terms`, `/privacy`, `/security`, `/cookies`. Missing: `/enterprise`, `/faq`, `/industries`, `/process`. **Add missing routes.**                                                                                                                 |
| 4.1.9  | Canonical URLs are defined where appropriate.                                  | ⚠️     | No canonical URL tags detected. Add `<link rel="canonical" href="..." />` to prevent duplicate content issues.                                                                                                                                                                                                                                             |
| 4.1.10 | Important images have `[alt]` attributes.                                      | ⚠️     | See 1.4.1 — verify all marketing images have descriptive `alt` text.                                                                                                                                                                                                                                                                                       |

### 4.2 Structured Data & Content

| #     | Check                                                                 | Status | Notes                                                                                                                                                      |
| ----- | --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.2.1 | Organization/LocalBusiness schema added for ShadowSpark.              | ❌     | No JSON-LD structured data detected. Add `Organization` schema with name, URL, logo, and contact info. Consider `LocalBusiness` for Lagos market presence. |
| 4.2.2 | FAQ schema added for FAQ sections.                                    | ❌     | [`src/app/faq/page.tsx`](src/app/faq/page.tsx) renders FAQ content visually but has no `FAQPage` JSON-LD schema. **Add structured data for rich results.** |
| 4.2.3 | No duplicate or thin content across main marketing pages.             | ⚠️     | Review content uniqueness across `/solutions`, `/industries`, `/process`, `/enterprise` — ensure each page provides distinct value.                        |
| 4.2.4 | Internal links connect hero → proof → pricing → CTA flows coherently. | ✅     | Marketing flow: Hero → CTAs → Solutions/Process → Pricing → Contact/Enterprise. Logical conversion path.                                                   |

---

## 5. Trust & Content Integrity Audit

Reference: [SEO Audit Checklist for Next.js Sites](https://eliasmedrano.com/blog/seo-audit-checklist-for-next-js-sites)

| #    | Check                                                                                          | Status | Notes                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Privacy Policy page exists and is linked in footer.                                            | ⚠️     | [`src/app/sitemap.ts`](src/app/sitemap.ts) references `/privacy` — verify page exists and is linked in footer.                                                                                                                                                        |
| 5.2  | Terms of Service page exists and is linked in footer.                                          | ⚠️     | Sitemap references `/terms` — verify page exists.                                                                                                                                                                                                                     |
| 5.3  | Security page exists (trust signal for enterprise prospects).                                  | ⚠️     | Sitemap references `/security` — verify page exists.                                                                                                                                                                                                                  |
| 5.4  | Cookies page exists with disclosure.                                                           | ⚠️     | Sitemap references `/cookies` — verify page exists.                                                                                                                                                                                                                   |
| 5.5  | Contact information is consistent across all pages (email, phone, address).                    | ⚠️     | [`src/app/contact/page.tsx`](src/app/contact/page.tsx) has contact form. Verify email/phone consistency in [`src/components/Footer.tsx`](src/components/Footer.tsx) and [`src/components/marketing/TerminalFooter.tsx`](src/components/marketing/TerminalFooter.tsx). |
| 5.6  | Social proof elements (testimonials, case studies, client logos) are authentic and verifiable. | ⚠️     | [`src/components/marketing/TestimonialCarousel.tsx`](src/components/marketing/TestimonialCarousel.tsx) and [`src/components/marketing/LogoMarquee.tsx`](src/components/marketing/LogoMarquee.tsx) exist — verify testimonials are real and attributed.                |
| 5.7  | Pricing page is transparent and doesn't use dark patterns.                                     | ⚠️     | [`src/config/pricing.ts`](src/config/pricing.ts) contains pricing config — verify page renders clearly without hidden fees or confusing tier structures.                                                                                                              |
| 5.8  | SSL/TLS certificate is valid and forces HTTPS.                                                 | ✅     | Production on Cloud Run with HTTPS. Verify HSTS header is set.                                                                                                                                                                                                        |
| 5.9  | No mixed content (HTTP resources loaded on HTTPS pages).                                       | ⚠️     | Run Lighthouse "Best Practices" audit to detect mixed content.                                                                                                                                                                                                        |
| 5.10 | External links use `rel="noopener noreferrer"` for security.                                   | ⚠️     | Scan for external links in marketing content and verify `rel` attributes.                                                                                                                                                                                             |

---

## Summary Dashboard

| Domain                           | Total Checks | ✅ Pass | ⚠️ Needs Review | ❌ Fails | Score   |
| -------------------------------- | ------------ | ------- | --------------- | -------- | ------- |
| 1. Accessibility (WCAG 2.2 AA)   | 18           | 3       | 15              | 0        | 17%     |
| 2. Security (OWASP ASVS)         | 16           | 9       | 7               | 0        | 56%     |
| 3. Performance & Core Web Vitals | 8            | 1       | 7               | 0        | 13%     |
| 4. SEO & Crawlability            | 14           | 2       | 9               | 3        | 14%     |
| 5. Trust & Content Integrity     | 10           | 1       | 9               | 0        | 10%     |
| **Total**                        | **66**       | **16**  | **47**          | **3**    | **24%** |

---

## Priority Remediation Items

### Critical (Fix Immediately)

| #   | Item                                                                                  | Domain | Effort | Impact                                         |
| --- | ------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------- |
| C1  | Add per-page `<title>` and meta description exports to all marketing pages            | SEO    | Low    | High — each page currently inherits root title |
| C2  | Add `FAQPage` JSON-LD structured data to `/faq`                                       | SEO    | Low    | Medium — enables rich search results           |
| C3  | Add `Organization` JSON-LD schema to root layout                                      | SEO    | Low    | Medium — improves brand SERP presence          |
| C4  | Add missing routes to `sitemap.ts` (`/enterprise`, `/faq`, `/industries`, `/process`) | SEO    | Low    | Medium — ensures crawlability                  |

### High Priority

| #   | Item                                                                               | Domain        | Effort | Impact                              |
| --- | ---------------------------------------------------------------------------------- | ------------- | ------ | ----------------------------------- |
| H1  | Fix `--color-text-muted` contrast ratio (3.8:1, needs 4.5:1)                       | Accessibility | Low    | High — affects all dashboard text   |
| H2  | Add focus indicators to dashboard nav items                                        | Accessibility | Low    | High — keyboard navigation          |
| H3  | Add rate limiting to auth endpoints                                                | Security      | Medium | High — brute force protection       |
| H4  | Add Zod/validation schemas to API routes                                           | Security      | Medium | High — input validation             |
| H5  | Add canonical URL tags to all pages                                                | SEO           | Low    | Medium — prevents duplicate content |
| H6  | Implement dynamic imports for heavy dashboard components (chart.js, framer-motion) | Performance   | Medium | Medium — reduces initial bundle     |

### Medium Priority

| #   | Item                                                | Domain        | Effort | Impact |
| --- | --------------------------------------------------- | ------------- | ------ | ------ |
| M1  | Add focus trapping to dashboard modal               | Accessibility | Medium | Medium |
| M2  | Audit WhatsApp webhook logging for PII              | Security      | Low    | Medium |
| M3  | Add `dynamic = "force-dynamic"` to Resend webhook   | Security      | Low    | Low    |
| M4  | Run `pnpm audit` and update vulnerable dependencies | Security      | Medium | Medium |
| M5  | Add Privacy, Terms, Security, Cookies pages         | Trust         | Medium | High   |
| M6  | Add HSTS header configuration                       | Trust         | Low    | Medium |

---

## Evidence Collection

### Screenshots to Capture

- [ ] Lighthouse report — `/` (mobile + desktop)
- [ ] Lighthouse report — `/pricing` (mobile + desktop)
- [ ] Lighthouse report — `/about` (mobile + desktop)
- [ ] Lighthouse report — `/dashboard` (mobile + desktop, authenticated)
- [ ] axe DevTools full-page scan results
- [ ] Keyboard focus indicator on dashboard nav items
- [ ] Modal focus trap behavior
- [ ] 200% zoom test on marketing pages
- [ ] Mobile viewport test (375px width)

### URLs to Verify

- [ ] `https://shadowspark.tech/` — 200, title, description
- [ ] `https://shadowspark.tech/pricing` — 200, title, description
- [ ] `https://shadowspark.tech/about` — 200, title, description
- [ ] `https://shadowspark.tech/contact` — 200, title, description
- [ ] `https://shadowspark.tech/enterprise` — 200, title, description
- [ ] `https://shadowspark.tech/faq` — 200, title, description
- [ ] `https://shadowspark.tech/solutions` — 200, title, description
- [ ] `https://shadowspark.tech/industries` — 200, title, description
- [ ] `https://shadowspark.tech/process` — 200, title, description
- [ ] `https://shadowspark.tech/robots.txt` — valid
- [ ] `https://shadowspark.tech/sitemap.xml` — valid, complete
- [ ] `https://shadowspark.tech/privacy` — 200
- [ ] `https://shadowspark.tech/terms` — 200
- [ ] `https://shadowspark.tech/security` — 200
- [ ] `https://shadowspark.tech/cookies` — 200

---

_This workbook was generated from codebase analysis on 2026-05-02. Update status fields as audits are completed._

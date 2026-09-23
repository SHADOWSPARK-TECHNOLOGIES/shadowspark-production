---
name: security-review
description: Comprehensive security review methodology covering the 10 critical fintech and compliance attack surfaces.
version: 1.0.0
tags:
  - security
  - attack-surfaces
  - tenant-isolation
  - idor
  - pii
  - idempotency
  - secrets
---

# Security Review Skill

## 1. Overview & Quick Reference

In financial technology and compliance infrastructure, security vulnerabilities lead directly to regulatory penalties, data breaches, and financial loss. Every pull request, feature implementation, and refactoring must undergo a rigorous security review covering the **10 Critical Attack Surfaces**.

### The 10 Attack Surfaces Matrix

| # | Attack Surface | Threat Vector | Non-Negotiable Defense |
|---|----------------|---------------|------------------------|
| **1** | **Tenant Bypass** | Attacker specifies another tenant's ID in request body, params, or headers. | Derive tenant ID strictly from authenticated server session + database `TenantMembership`. Never trust client-supplied tenant identifiers. |
| **2** | **IDOR** | Attacker probes object IDs (`/reviews/[briefId]`) belonging to other tenants. | Enforce compound tenant scoping on every query (`where: { id, tenantId }`). |
| **3** | **Service-Token Leakage** | Upstream backend tokens (`AI_ASSIST_SERVICE_TOKEN`) exposed to browser. | Restrict upstream service tokens to server boundary; never prefix with `NEXT_PUBLIC_`; never leak in error payloads. |
| **4** | **Unsafe Retries & Idempotency** | Network retries duplicate payments, compliance annotations, or reviews. | Enforce unique `Idempotency-Key` headers on mutating requests with database-backed tracking. |
| **5** | **PII Leakage** | 11-digit national identity numbers or sensitive customer data leaked in logs/UI. | Mask sensitive 11-digit identifiers (`***-***-12345`); filter logs; contain ChatWidget away from sensitive dashboards. |
| **6** | **Auth Confusion & RBAC** | Session privilege escalation (e.g. regular user accessing ADMIN routes). | Strict role checks against database membership (`ADMIN`, `OPERATOR`); separate browser session from API bearer tokens. |
| **7** | **CORS & Host Header** | Permissive origins or untrusted Host headers enabling CSRF / phishing. | Restrict CORS on authenticated APIs; validate hostnames against trusted configuration. |
| **8** | **Injection (SQL / Prompt)** | SQL injection or LLM prompt injection overriding compliance decisions. | Prisma parameterized queries; Zod schema validation; AI advice is advisory-only, never auto-mutating source of record. |
| **9** | **Generic Proxy Misuse** | SSRF or internal network probing via generic forwarding routes (`/api/proxy/*`). | Prohibit generic proxy endpoints. All external communication must use typed, bounded server adapters. |
| **10** | **Unsafe Defaults** | Fallback to open permissions or demo tenants when authentication fails. | Fail closed: throw error or return 401/403 when authentication or configuration is missing or ambiguous. |

---

## 2. Core Rules & Invariants

1. **Zero Trust on Client Input**:
   - Never trust `tenantId`, `userId`, or `role` passed in request bodies, query strings, or headers. Always derive from cryptographic session / token verified by server.
2. **Fail Closed**:
   - If an authorization check encounters an error, a missing database record, or ambiguous permissions, immediately reject with HTTP 401 or 403.
3. **Audit Execution**:
   - Run the credential leak scan (`npm run test:secrets`) before every commit or release handoff.
4. **Advisory Containment for AI**:
   - AI-generated compliance recommendations must never silently mutate source-of-record business status without explicit human operator approval.

---

## 3. Step-by-Step Review Procedures for the 10 Surfaces

### Surface 1: Tenant Bypass Audit
- **Inspection**:
  Inspect all route handlers in `src/app/api/`.
  Check how `tenantId` is obtained:
  ```typescript
  // ❌ VULNERABLE: Client input trusted
  const { tenantId } = await request.json();
  const reviews = await prisma.review.findMany({ where: { tenantId } });

  // ✅ SECURE: Derived from verified server session
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id }
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = membership.tenantId;
  ```

### Surface 2: IDOR Audit
- **Inspection**:
  Check single-resource lookup endpoints (e.g. `GET /api/compliance/reviews/[briefId]`):
  ```typescript
  // ❌ VULNERABLE: Lookup by ID alone
  const review = await prisma.review.findUnique({ where: { id: briefId } });

  // ✅ SECURE: Scoped to verified tenant
  const review = await prisma.review.findFirst({
    where: { id: briefId, tenantId: verifiedTenantId }
  });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  ```

### Surface 3: Service-Token Leakage Audit
- **Inspection**:
  Search for upstream service token references:
  ```bash
  grep -rn "AI_ASSIST_SERVICE_TOKEN" src/
  ```
  Verify:
  - Token is used exclusively in `src/lib/ai-assist/` server-side code.
  - Never exposed via `process.env.NEXT_PUBLIC_*`.
  - Never included in error responses returned to the client:
    ```typescript
    // ❌ VULNERABLE: Leaking error details containing auth header
    catch (err: any) {
      return NextResponse.json({ error: err.message, request: err.config }, { status: 500 });
    }
    // ✅ SECURE: Sanitized error response
    catch (err: any) {
      logger.error({ err: err.message }, "Upstream AI-ASSIST call failed");
      return NextResponse.json({ error: "Upstream service error" }, { status: 502 });
    }
    ```

### Surface 4: Unsafe Retries & Idempotency Audit
- **Inspection**:
  Inspect all mutating endpoints (POST, PUT, PATCH):
  - Is `Idempotency-Key` header extracted and validated?
  - Are duplicate requests identified and served from cached responses without re-executing side-effects?
  - Does the upstream adapter forward the `Idempotency-Key` header to AI-ASSIST?

### Surface 5: PII Leakage & ChatWidget Containment Audit
- **Inspection**:
  - Search for 11-digit national identity numbers (BVN / NIN / SSN):
    ```bash
    grep -rnE "\b[0-9]{11}\b" src/
    ```
  - Verify masking in UI and audit logs: format as `***-***-12345`.
  - Check ChatWidget containment: `<ChatWidget />` must be suppressed on authenticated compliance surfaces (`/dashboard/*`, `/admin/*`, `/operator/*`) to prevent sensitive document exposure to third-party chat widgets.

### Surface 6: Auth Confusion & RBAC Audit
- **Inspection**:
  - Review role hierarchy in `src/auth.ts` and Prisma schema (`ADMIN`, `OPERATOR`, `VIEWER`).
  - Ensure administrative actions verify `membership.role === "ADMIN"`.
  - Ensure NextAuth browser cookies and API bearer tokens cannot be interchanged insecurely.

### Surface 7: CORS & Host Header Audit
- **Inspection**:
  - Inspect `next.config.ts` or custom middleware for `Access-Control-Allow-Origin`.
  - Ensure wildcards (`*`) are not used on authenticated endpoints with credentials.
  - Reject untrusted `X-Forwarded-Host` or `Host` headers in redirect logic.

### Surface 8: Injection (SQL / Command / LLM Prompt) Audit
- **Inspection**:
  - Check Prisma queries: Ensure no `prisma.$queryRawUnsafe` with concatenated strings.
  - Check command execution: No `exec()` with unsanitized user arguments.
  - Check LLM prompts: Prompts incorporating customer input must use clear delimiters (e.g. `<user_input>...</user_input>`) and AI recommendations must be marked as advisory.

### Surface 9: Generic Proxy Misuse Audit
- **Inspection**:
  - Verify that no generic catch-all proxy routes exist (e.g. `src/app/api/proxy/[...path]/route.ts`).
  - All outbound requests must target explicit, statically configured hostnames defined in server environment variables.

### Surface 10: Unsafe Defaults & Fallbacks Audit
- **Inspection**:
  - Inspect `src/lib/config/validateEnv.ts`.
  - Ensure mandatory variables (`JWT_SECRET`, `DATABASE_URL`, `AI_ASSIST_SERVICE_TOKEN`) cause the application to fail fast on startup if missing.
  - Verify default roles: Never default an unknown user to `ADMIN`.

---

## 4. Remediation & Verification Commands

Execute the secret leak test:
```bash
npm run test:secrets
```

Perform automated pattern scans:
```bash
# Check for raw SQL queries
grep -rn "\$queryRawUnsafe" src/

# Check for hardcoded API keys or secrets
git diff | grep -iE "(secret|token|password|bearer|key)\s*[:=]"
```

---

## 5. Security Sign-off Checklist

Before approving or handing off any change:
- [ ] Tenant identity derived authoritatively from server auth context (Surface 1).
- [ ] All database queries scoped to tenant ID (Surface 2).
- [ ] Upstream service tokens confined to server boundary (Surface 3).
- [ ] Mutating endpoints require and enforce idempotency (Surface 4).
- [ ] PII masked; ChatWidget excluded from dashboard/compliance routes (Surface 5).
- [ ] RBAC roles enforced and verified against database (Surface 6).
- [ ] CORS and Host headers strictly validated (Surface 7).
- [ ] Zero raw SQL or unsanitized command execution (Surface 8).
- [ ] Zero generic proxy endpoints (Surface 9).
- [ ] Fail-closed error handling and mandatory env validation verified (Surface 10).
- [ ] `npm run test:secrets` passes cleanly.

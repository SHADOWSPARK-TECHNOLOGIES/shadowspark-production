# Test Infrastructure & Opaque-Box E2E Testing Framework

## 1. Overview

This document defines the test architecture, test runner invocation, methodology, and verification criteria for **shadowspark-production**, specifically covering the compliance integration with the upstream **AI-ASSIST v1.1.0** service, multi-tenant isolation, idempotency guarantees, fail-closed security, and error-state mappings.

Testing operates on an **opaque-box** contract model: tests submit standard Web API `Request` instances (with HTTP headers, query parameters, and JSON payloads) to Next.js route handlers and evaluate observable `Response` instances (HTTP status codes, CORS headers, JSON envelope payloads, and deterministic error codes) without relying on internal function implementations.

---

## 2. Test Runner Invocation

### 2.1 Runtime Engine
- **Node.js**: `24.x` (managed via `fnm` or host environment)
- **Framework**: Vitest 5.x (`vitest run`) with V8 coverage provider
- **TypeScript**: 5.x with strict typechecking (`tsc --noEmit`)

### 2.2 Execution Commands

| Target | Command | Purpose |
|---|---|---|
| **E2E Test Suite (All)** | `npx vitest run tests/e2e` | Executes all opaque-box E2E suites |
| **E2E Test Suite (fnm explicit)** | `fnm exec --using=24 npx vitest run tests/e2e` | Executes E2E tests using Node 24 runtime |
| **npm test runner (E2E filter)** | `npm test -- tests/e2e` | Runs E2E tests via npm test alias |
| **Compliance Flow E2E** | `npx vitest run tests/e2e/compliance-flow.test.ts` | Complete brief creation, listing, detail, annotation flow |
| **Tenant Isolation E2E** | `npx vitest run tests/e2e/tenant-isolation.test.ts` | Cross-tenant boundaries, spoofing defenses, fail-closed auth |
| **Idempotency E2E** | `npx vitest run tests/e2e/idempotency.test.ts` | Idempotent replays, missing keys, conflict detection, tenant scoping |
| **Error States E2E** | `npx vitest run tests/e2e/error-states.test.ts` | 10-state response verification (400, 401, 403, 404, 409, 422, 429, 502, 503, 504) |
| **Full Repository Test Suite** | `npm run test` | Executes all 38+ unit, integration, and E2E test files |
| **Credential & Secret Scan** | `npm run test:secrets` | Ensures zero secrets or tokens are leaked in repository |
| **Static Typecheck** | `npm run typecheck` | Compiles full TypeScript project without emitting artifacts |
| **Code Linter** | `npm run lint` | Verifies Next.js and ESLint rule compliance |

---

## 3. Tiered Testing Methodology (Tiers 1–4)

ShadowSpark adheres to a four-tier testing taxonomy:

```
+-------------------------------------------------------------+
| Tier 4: Security, Resilience & Boundary Stress              |
|         Multi-tenant boundaries, fail-closed auth,         |
|         idempotency collisions, 10 error states, passkey    |
+-------------------------------------------------------------+
| Tier 3: Opaque-Box E2E Functional Flows                    |
|         Full lifecycle: Create Brief -> List Queue ->       |
|         Inspect Detail -> Append Operator Annotation        |
+-------------------------------------------------------------+
| Tier 2: Component & Integration Routes                     |
|         Next.js App Router handlers, session bridge,       |
|         database tenant resolution, environment validation  |
+-------------------------------------------------------------+
| Tier 1: Unit & Upstream Contract Tests                     |
|         Typed client builders, header serialization,        |
|         status code mapping, crypto token signing/verify   |
+-------------------------------------------------------------+
```

### Tier 1: Unit & Upstream Contract Tests
- **Location**: `tests/ai-assist-client.test.ts`, `tests/auth-credentials.test.ts`
- **Scope**: Validates low-level building blocks:
  - Header assembly: `Authorization: Bearer <token>`, `X-Tenant-ID`, `Idempotency-Key`, `X-Request-ID`.
  - Secret containment: verifies raw service tokens never leak to browser or error payloads.
  - Upstream error code mapping (`mapUpstreamStatus` in `src/lib/ai-assist/errors.ts`).
  - Cryptographic token signing and signature verification (`src/lib/auth.ts`).

### Tier 2: Component & Integration Routes
- **Location**: `tests/api/compliance.test.ts`, `tests/api/messages.test.ts`, `tests/api/kyc.test.ts`
- **Scope**: Exercises Next.js API route handlers in isolation with hoisted mocks for dependencies:
  - Validates session-to-tenant bridge via `resolveComplianceAuth`.
  - Validates CORS preflight handling (`OPTIONS`) and headers.
  - Verifies mandatory environment variable enforcement (`JWT_SECRET`, `AI_ASSIST_API_URL`, `AI_ASSIST_API_TOKEN`).

### Tier 3: Opaque-Box E2E Functional Flows
- **Location**: `tests/e2e/compliance-flow.test.ts`
- **Scope**: Exercises complete business lifecycles through public HTTP route interfaces:
  - **Step 1 — Brief Ingestion**: `POST /api/compliance/briefs` with `Idempotency-Key` and `exception_id`.
  - **Step 2 — Queue Listing**: `GET /api/compliance/reviews` with pagination (`limit`, `offset`) and state filtering (`pending_review`).
  - **Step 3 — Review Detail Inspection**: `GET /api/compliance/reviews/[briefId]`.
  - **Step 4 — Operator Annotation**: `POST /api/compliance/reviews/[briefId]/annotations` with `Idempotency-Key`.
  - **Step 5 — State Transition Verification**: Confirms queue item advances from `pending_review` to `annotated`, and audit trail contains operator fingerprint without duplicating side effects.

### Tier 4: Security, Resilience & Boundary Stress
- **Location**: `tests/e2e/tenant-isolation.test.ts`, `tests/e2e/idempotency.test.ts`, `tests/e2e/error-states.test.ts`
- **Scope**: Adversarial verification of fintech-grade security invariants:
  - **Zero-Trust Multi-Tenancy**: Tenant A cannot read or mutate Tenant B's briefs (indistinguishable 404 responses prevent resource enumeration).
  - **Tenant Header Spoofing Rejection**: Client passing mismatched `x-tenant-slug` header is immediately rejected with HTTP 403 `TENANT_MISMATCH`.
  - **Fail-Closed Authentication**: Unauthenticated requests, expired tokens, tampered HMAC signatures, and users without tenant membership fail closed (401/403).
  - **Passkey Containment**: `POST /api/auth/verify-login` returns fail-closed HTTP 503 (`Passkey sign-in is temporarily unavailable`).
  - **Idempotency Engine**: Enforces required `Idempotency-Key` on all mutating operations, delivers consistent cached replay responses, detects payload conflicts (409), and ensures tenant-scoped idempotency isolation.
  - **10-State Upstream Error Mapping**: Exhaustively verifies HTTP 400, 401, 403, 404, 409, 422 (raw national ID rejection), 429 (LLM06 budget trip), 502 (bad gateway / upstream auth), 503 (service unavailable), and 504 (gateway timeout).

---

## 4. Coverage Thresholds & Quality Gates

To satisfy the **Victory Audit** criteria, the test suite enforces the following thresholds:

| Metric | Target Threshold | Mandatory Requirement |
|---|---|---|
| **E2E Test Pass Rate** | 100% | 0 failing tests allowed |
| **Full Suite Pass Rate** | 100% | 0 failing tests across all 38+ test suites |
| **Static Typecheck** | Clean (0 errors) | `tsc --noEmit` must exit 0 |
| **Linting Compliance** | Clean (0 errors) | `eslint` must exit 0 |
| **Credential Hygiene** | 0 leaks detected | `npm run test:secrets` must pass |
| **Statement Coverage** | >= 85% | For compliance routes and adapter libraries |
| **Branch Coverage** | >= 80% | For authentication and error mapping paths |

---

## 5. Security & Isolation Standards

1. **No Mocked Verifications**: E2E tests do not bypass authentication or internal logic. Real HMAC cryptographic signatures, real JSON serialization, and real HTTP error responses are exercised.
2. **Credential Sanitization**: The upstream service token (`AI_ASSIST_API_TOKEN`) and browser bearer tokens are verified never to appear in JSON response bodies, logs, or error details.
3. **Sensitive PII Guard**: Payloads containing 11-digit national identity numbers (BVN/NIN) matching `(?<!\d)\d{11}(?!\d)` are verified to be rejected with HTTP 422 (`UNPROCESSABLE_ENTITY`).
4. **Idempotency Multi-Tenant Isolation**: Two distinct tenants submitting the identical `Idempotency-Key` must succeed independently without key collision or cross-tenant contamination.

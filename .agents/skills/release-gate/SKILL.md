---
name: release-gate
description: Release readiness gate, independent Victory Audit criteria, test and build verification, and deployment safeguards.
version: 1.0.0
tags:
  - release
  - audit
  - victory-audit
  - ci-cd
  - deployment
  - verification
---

# Release Gate & Victory Audit Skill

## 1. Overview & Quick Reference

The Release Gate establishes the mandatory verification protocol before any code change can be merged, released, or deployed. To prevent regressions, security vulnerabilities, and deployment failures, every release candidate must pass all automated quality gates and undergo an independent Victory Audit.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Gate 1:     │     │  Gate 2:     │     │  Gate 3:     │     │  Gate 4:     │
│  Git Hygiene │ ──► │  Typecheck   │ ──► │  Lint Clean  │ ──► │  Test Suite  │
│  (No strays) │     │  (tsc zero)  │     │  (eslint)    │     │  (100% pass) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│  Gate 8:     │     │  Gate 7:     │     │  Gate 6:     │     ┌───────▼──────┐
│  User Auth   │ ◄── │  Victory     │ ◄── │  Production  │ ◄── │  Gate 5:     │
│  (Merge PR)  │     │  Audit       │     │  Build Pass  │     │  Secret Scan │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Pre-Flight Verification Commands
Run the complete release verification suite in sequence:

```bash
# 1. TypeScript compilation check
npm run typecheck

# 2. ESLint code quality check
npm run lint

# 3. Vitest automated test suite
npm test

# 4. Credential and secret leak scan
npm run test:secrets

# 5. Production Next.js build
npm run build
```

---

## 2. Core Non-Negotiables & Invariants

1. **Independent Victory Audit**:
   - The Victory Audit must be performed by an independent auditor (e.g. `RELEASE_AUDITOR` or peer reviewer).
   - An implementer must **NEVER** audit or self-certify their own pull request or milestone.

2. **No Merging Without User Authorization**:
   - Automated pull requests must not be merged into `main` unless the user explicitly grants authorization in the conversation.

3. **No Cheating or Facade Verification**:
   - Tests must execute genuine assertions against real state.
   - Any test marked with `.skip()`, `test.todo()`, or using hardcoded return fixtures to bypass failures invalidates the release gate.

4. **External Blocker Handling (`READY_TO_DEPLOY`)**:
   - If an external blocker (e.g. missing production deployment keys, third-party cloud outage) prevents final deployment, the release halts cleanly at `READY_TO_DEPLOY` with exact, documented evidence. Do not attempt unapproved workarounds.

---

## 3. Step-by-Step Victory Audit Protocol

The independent auditor executes the following 6-step audit:

### Step 1: Git Provenance & Working Tree Audit
1. Inspect branch status and working tree cleanliness:
   ```bash
   git status --short --branch
   ```
   - Ensure no leftover `.bak`, `.tmp`, or scratch files remain in the working tree.
2. Review commit log and diffs:
   ```bash
   git log -n 10 --oneline --decorate
   git diff main...HEAD
   ```
   - Verify every commit corresponds to an authorized feature or bugfix.

### Step 2: Test Suite Integrity Audit
1. Inspect test files for skipped tests or hollow assertions:
   ```bash
   grep -rnE "\.(skip|only)\(" tests/
   ```
   - Result must be completely empty.
2. Confirm test coverage across critical paths:
   - Server adapter error mappings (400, 401, 403, 404, 502).
   - Tenant isolation enforcement.
   - Idempotency replay mechanisms.

### Step 3: Upstream Contract Alignment Audit
1. Compare implementation against the frozen AI-ASSIST v1.1.0 contract:
   - Verify endpoints: `GET /v1/review-queue`, `GET /v1/review-queue/{brief_id}`, `POST /v1/review-queue/{brief_id}/annotations`.
   - Verify headers: `Authorization: Bearer <token>`, `X-Tenant-ID: <tenantId>`, `Idempotency-Key: <key>`.
   - Ensure error responses map upstream status 400 to HTTP 400 (not 502).

### Step 4: Full Automated Pipeline Execution
Run the 5 verification commands in a clean environment and observe verbatim output:
- `npm run typecheck` -> Exit code 0, 0 errors.
- `npm run lint` -> Exit code 0, 0 warnings/errors.
- `npm test` -> Exit code 0, all test suites pass.
- `npm run test:secrets` -> Exit code 0, 0 leaked credentials.
- `npm run build` -> Exit code 0, Next.js build succeeds with all static/dynamic routes compiled.

### Step 5: Frontend & Backend Compatibility Audit
1. Verify compliance dashboard routes:
   - `/dashboard/reviews` (Queue listing)
   - `/dashboard/reviews/[briefId]` (Detail & annotations)
2. Confirm the 10 required UI states are implemented:
   - `loading`, `empty`, `success`, `validation_failure`, `401`, `403`, `404`, `409`, `429`, `503`, `504_timeout`.
3. Ensure `<ChatWidget />` is suppressed on dashboard and compliance routes.

### Step 6: Live Smoke Verification (or `READY_TO_DEPLOY`)
1. If deployed to staging/production:
   - Query the health endpoint: `curl -sS https://<app-host>/api/health`.
   - Verify status 200 and commit SHA identity match HEAD.
2. If deployment credentials are not available:
   - Mark status as `READY_TO_DEPLOY`.
   - Document exact missing credentials or blockers in the audit report.

---

## 4. Victory Audit Attestation Template

When concluding an audit, the auditor writes the attestation to `docs/engineering/VICTORY_AUDIT.md`:

```markdown
# VICTORY AUDIT REPORT

- **Auditor**: <Auditor Agent / Name>
- **Date**: <ISO Timestamp>
- **Branch**: <Branch Name>
- **Commit HEAD**: <Git SHA>
- **Status**: APPROVED | REJECTED | READY_TO_DEPLOY

## 1. Verification Gates
- [x] Git Hygiene: Clean tree, zero untracked scratch files
- [x] Typecheck: `npm run typecheck` passed (0 errors)
- [x] Linting: `npm run lint` passed (0 warnings)
- [x] Automated Tests: `npm test` passed (<N> tests passed)
- [x] Secret Leak Test: `npm run test:secrets` passed (0 leaks)
- [x] Production Build: `npm run build` passed (all routes compiled)

## 2. Security Review (10 Surfaces)
- [x] Tenant bypass prevented; server-derived context verified
- [x] IDOR protection verified across all routes
- [x] Service token isolated to server boundary
- [x] Idempotency enforced on mutating operations
- [x] Sensitive PII masked; ChatWidget contained
- [x] RBAC enforcement verified
- [x] CORS and Host headers verified
- [x] Injection protections in place
- [x] Generic proxy routes absent
- [x] Fail-closed security behavior confirmed

## 3. Deployment & Live Verification
- **Target**: <Environment or READY_TO_DEPLOY>
- **Evidence**: <Health check output or blocker details>

## 4. Auditor Recommendation
Ready for user authorization to merge and deploy.
```

---

## 5. Common Pitfalls & Anti-Patterns

- **Self-Auditing**: Author signing off on their own pull request.
- **Ignoring Typecheck Warnings**: Relying only on unit tests when `npm run typecheck` has errors.
- **Bypassing Build**: Assuming that passing Vitest tests guarantees a successful Next.js production build (`npm run build` validates webpack/turbopack bundling, server/client component boundaries, and export configs).
- **Silent Merging**: Merging a PR to `main` without waiting for explicit user approval.

---

## 6. Self-Verification Checklist

Before presenting a candidate to the Release Gate:
- [ ] All 5 verification commands executed with clean exit code 0 observed.
- [ ] Git status clean with zero untracked artifacts.
- [ ] Victory Audit performed by an independent role.
- [ ] Attestation report authored and committed.

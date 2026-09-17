---
name: systematic-debug
description: Four-phase root-cause debugging protocol: Observe, Hypothesize, Reproduce & Isolate, Fix & Verify.
version: 1.0.0
tags:
  - debugging
  - troubleshooting
  - root-cause
  - vitest
  - diagnostics
---

# Systematic Debugging Skill

## 1. Overview & Quick Reference

Systematic debugging is a disciplined, hypothesis-driven methodology for diagnosing and resolving software defects. Guessing, random code modifications ("shotgun debugging"), and error-suppression hacks are strictly prohibited. Every bug must be resolved by proving its root cause with reproducible evidence.

```
       ┌───────────────────────────────┐
       │     Phase 1: OBSERVE          │
       │  (Collect verbatim evidence)  │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   Phase 2: FORMULATE HYPOTHESIS│
       │   (Falsifiable root cause)    │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   Phase 3: REPRODUCE & ISOLATE │
       │  (Isolate variables & repro)  │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   Phase 4: FIX & VERIFY       │
       │  (Targeted fix, no regression)│
       └───────────────────────────────┘
```

### Immediate Action Checklist
- [ ] Record the exact command, exit code, and verbatim error message / stack trace.
- [ ] Inspect git diffs and recent commit logs to identify what changed.
- [ ] State a single, falsifiable hypothesis: "The failure occurs because X, causing Y."
- [ ] Isolate the failure into a minimal reproducible test case.
- [ ] Apply the smallest technically sound fix addressing the root cause.
- [ ] Verify the reproduction case passes and the entire test suite remains clean.
- [ ] Remove all temporary diagnostic code or logs before completing the task.

---

## 2. Core Non-Negotiables & Invariants

1. **No Shotgun Debugging**:
   - Never randomly modify code, change variable types, or flip configuration flags in hopes of getting a test to pass. Every edit must be supported by an explicit hypothesis.

2. **No Error Suppression**:
   - Never catch and swallow exceptions without handling or re-throwing.
   - Never use `as any`, `@ts-ignore`, or `# eslint-disable` to silence type check or linter errors unless diagnosing a proven compiler bug.

3. **Treat Historical Hypotheses as Unverified**:
   - Audit reports from previous agents or previous runs represent hypotheses until verified against the active codebase state.

---

## 3. Step-by-Step Operating Procedure

### Phase 1: OBSERVE — Gather Exact Evidence
Do not jump to conclusions. Collect observable facts:
1. **Verbatim Error Output**:
   Capture the exact terminal or test output, including error name, message, and stack trace line numbers.
2. **Environment & Runtime Context**:
   Verify Node version (`node -v`), environment variables (`.env.test`, `.env.local`), and database availability.
3. **Inspect Recent Diffs**:
   ```bash
   git status --short
   git diff
   git log -n 3 --oneline
   ```
4. **Inspect Source at Error Site**:
   Use `view_file` to view 20 lines before and after the exact line indicated in the stack trace.

### Phase 2: FORMULATE HYPOTHESIS — Deduce Root Cause
Structure your reasoning into an explicit hypothesis:
- **Observation**: "When `GET /api/compliance/reviews` is invoked without cookies, the route returns HTTP 500 instead of HTTP 401."
- **Mechanism**: "The handler calls `session.user.id` without checking if `session` is null, throwing an unhandled `TypeError: Cannot read properties of null`."
- **Hypothesis**: "Guarding `session?.user?.id` and returning 401 when `session` is null will eliminate the 500 error and pass the unauthorized test."

### Phase 3: REPRODUCE & ISOLATE — Prove the Failure
Isolate the defect from irrelevant system noise:
1. **Targeted Test Execution**:
   Run only the failing test file or specific test case:
   ```bash
   npx vitest run tests/api/compliance.test.ts -t "handles unauthenticated requests"
   ```
2. **Variable Isolation**:
   - If a test fails in the full suite but passes in isolation: suspect shared global state, un-reset mocks (`vi.clearAllMocks()`), or database concurrency conflicts.
   - If a route fails: test the route handler directly with a simulated `Request` object before testing via HTTP server.
3. **Structured Diagnostic Logging**:
   Add temporary, structured debug output:
   ```typescript
   console.error("[DEBUG:auth-check]", { session, hasUser: !!session?.user });
   ```
   *Note: All debug logs must be removed prior to handoff.*

### Phase 4: ROOT CAUSE FIX & VERIFY — Apply & Validate
1. **Implement Minimal Fix**:
   Edit only the lines necessary to resolve the root cause. Do not refactor unrelated helper functions or reformat the file.
2. **Verify Reproduction Passes**:
   Run the isolated test case:
   ```bash
   npx vitest run tests/api/compliance.test.ts -t "handles unauthenticated requests"
   ```
3. **Full Regression Check**:
   Run all tests, type checking, and linting:
   ```bash
   npm run typecheck
   npm test
   npm run lint
   ```
4. **Diff Verification**:
   Inspect `git diff` to confirm zero unintended edits, commented-out code, or lingering debug logs.

---

## 4. ShadowSpark Diagnostic Playbooks

### Playbook A: NextAuth Session Resolution Failures (401 vs 500)
- **Symptom**: Route returns 500 Internal Server Error when session cookie is invalid or absent.
- **Cause**: Unsafe property access on `session` or unhandled error in `auth()` callback.
- **Fix**: Check `const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`.

### Playbook B: Upstream AI-ASSIST Status 400 Error Mapping
- **Symptom**: Upstream validation error returns 502 Bad Gateway to the browser instead of 400 Bad Request.
- **Cause**: Adapter error mapping logic treats all non-2xx responses as upstream infrastructure failures.
- **Fix**: Map upstream HTTP 400 Bad Request directly to HTTP 400 with the upstream error detail in `src/lib/ai-assist/errors.ts`.

### Playbook C: Next.js 16 Dynamic Route Params Failure
- **Symptom**: `TypeError: Cannot read properties of Promise (reading 'briefId')` or undefined route parameter.
- **Cause**: In Next.js 16, route parameters (`context.params`) are asynchronous Promises.
- **Fix**: Update handler signature to `context: { params: Promise<{ briefId: string }> }` and `await context.params` before reading properties.

### Playbook D: Prisma 7 Decimal vs Float Precision Mismatch
- **Symptom**: Database write fails with type mismatch, or calculation produces IEEE-754 precision drift (e.g. `10.000000000000002`).
- **Cause**: Using native JavaScript `number` for monetary values.
- **Fix**: Convert inputs using `new Prisma.Decimal(value)` and use Decimal methods (`add`, `sub`, `mul`).

---

## 5. Common Pitfalls & Anti-Patterns

- **Symptom Patching**: Wrapping a null-pointer error in a try/catch block rather than understanding why the expected object was not initialized.
- **Mock Contamination**: Forgetting `beforeEach(() => vi.clearAllMocks())`, causing mock state from one test to bleed into subsequent tests.
- **Ignoring the Stack Trace**: Scanning error messages without reading the top frames of the stack trace to identify the exact file and line number.
- **Unverified Fixes**: Declaring a bug fixed without re-running the exact reproduction test command.

---

## 6. Self-Verification Checklist

Before closing a debugging investigation:
- [ ] Stated the exact observation and falsifiable hypothesis in the handoff.
- [ ] Isolated the root cause with a targeted reproduction command.
- [ ] Confirmed the minimal fix resolves the issue.
- [ ] Verified full test suite (`npm test`) and typecheck (`npm run typecheck`) pass cleanly.
- [ ] Cleaned up all temporary diagnostic logs and debugging code.

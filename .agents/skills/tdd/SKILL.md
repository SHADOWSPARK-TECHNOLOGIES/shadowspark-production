---
name: tdd
description: Test-Driven Development (TDD) discipline: write failing test first, run under Node 24 runtime, implement minimal code, verify pass, and refactor.
version: 1.0.0
tags:
  - testing
  - tdd
  - vitest
  - node24
  - verification
---

# Test-Driven Development (TDD) Skill

## 1. Overview & Quick Reference

Test-Driven Development is an engineering discipline where automated tests define the specification before implementation begins. In this repository, code changes to business logic, API route handlers, server adapters, and security boundaries must be developed test-first.

```
       ┌───────────────────────────────┐
       │   1. RED: Write Failing Test   │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   2. VERIFY: Confirm Failure   │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │  3. GREEN: Minimal Code Fix   │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   4. VERIFY: Confirm Pass     │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │   5. REFACTOR: Clean & Polish │
       └───────────────────────────────┘
```

### Immediate Action Checklist
- [ ] Define the expected behavior, API contract, and error conditions.
- [ ] Author a focused test file in `tests/` asserting the new behavior.
- [ ] Run the test with `npx vitest run <path>` under Node 24 and observe it fail with the expected message.
- [ ] Write the minimum production code in `src/` to satisfy the test assertions.
- [ ] Re-run the test and observe a clean pass.
- [ ] Add edge case tests (401, 403, 400 validation failure, nulls, boundaries).
- [ ] Refactor cleanly and verify the entire test suite passes (`npm test`).

---

## 2. Core Non-Negotiables & Invariants

1. **Test Before Code**:
   - For all new endpoints, adapters, and domain logic, write the test before touching implementation files.
   - Do not write code and retroactively backfill tests that merely echo what the code happens to do.

2. **Integrity Mandate (Zero Cheating)**:
   - **DO NOT** hardcode return values in implementation solely to satisfy a test assertion.
   - **DO NOT** author vacuous assertions (e.g. `expect(response).toBeDefined()` without verifying status, payload structure, or side-effects).
   - **DO NOT** mock out the logic under test. Mocks are permitted ONLY at external system boundaries (e.g. third-party HTTP services, external payment gateways).

3. **Behavioral Testing Over Implementation Details**:
   - Assert observable behavior: HTTP response status, response JSON structure, database state mutations, and external calls.
   - Avoid asserting private variables or internal helper execution orders.

---

## 3. Step-by-Step Operating Procedure

### Step 1: Define Behavior & Contract
Before writing the test, articulate:
- What is the caller providing? (Headers, authentication context, query params, body)
- What is the expected status code? (200, 201, 400, 401, 403, 404, 502)
- What is the returned payload structure?
- What database records or external requests must be created or updated?

### Step 2: Write the Failing Test (RED)
Author the test using Vitest (`describe`, `it`, `expect`, `vi`).

Example: Testing an authenticated API route handler:
```typescript
// tests/api/compliance-reviews.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/compliance/reviews/route";

// Mock auth boundary
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock upstream adapter
vi.mock("@/lib/ai-assist/client", () => ({
  listComplianceReviews: vi.fn(),
}));

describe("GET /api/compliance/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails with 401 if user session is absent", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const request = new Request("http://localhost:3000/api/compliance/reviews");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("fails with 403 if user has no valid tenant membership", async () => {
    const { auth } = await import("@/auth");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user_123" } } as any);
    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/compliance/reviews");
    const response = await GET(request);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/Forbidden|tenant membership/i);
  });
});
```

### Step 3: Run the Test to Confirm Failure (VERIFY RED)
Execute the specific test file:
```bash
npx vitest run tests/api/compliance-reviews.test.ts
```
**Verification Check**:
- Did the test fail with a genuine failure (e.g. `Cannot find module`, `route handler returned 404`, or assertion error)?
- If the test passes immediately without implementation, the test is invalid or testing existing behavior.

### Step 4: Write Minimal Implementation (GREEN)
Implement the minimum viable logic in `src/` to turn the test green.

```typescript
// src/app/api/compliance/reviews/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden: No tenant membership found" }, { status: 403 });
  }

  // Next steps implemented test-by-test...
}
```

### Step 5: Verify Passing Test (VERIFY GREEN)
Re-run the targeted test:
```bash
npx vitest run tests/api/compliance-reviews.test.ts
```
Confirm output indicates 100% tests passing in the target file.

### Step 6: Expand Edge Cases & Boundary Conditions
Add test cases for:
- Input validation failures (Zod safeParse error -> 400).
- Upstream service error mapping (AI-ASSIST 400 -> 400; 503 -> 502/503).
- Missing headers or malformed query params.
- Boundary conditions (empty list, maximum limit).
- Idempotency key reuse on mutating POST endpoints.

### Step 7: Refactor & Run Full Regression Suite
Once all behaviors pass:
1. Clean up duplicate logic, refine variable names, and ensure strict TypeScript typing.
2. Run full test suite and secret leak detector:
   ```bash
   npm test
   npm run test:secrets
   ```

---

## 4. Common Pitfalls & Anti-Patterns

- **Confirmation Bias Testing**: Writing code first, then writing a test that asserts whatever the code currently outputs without checking whether that output is correct.
- **Over-Mocking**: Mocking every single helper until the test exercises only mocked wiring instead of actual business logic.
- **Flaky External Network Calls**: Making real HTTP calls to external servers during unit tests instead of using typed client mocks.
- **Skipped Test Accumulation**: Marking failing tests with `.skip()` instead of diagnosing and fixing the failure.

---

## 5. Self-Verification Checklist

Before reporting completion of a feature:
- [ ] Confirmed failing test output was observed prior to writing code.
- [ ] Verified test passes under Node 24 runtime with `npx vitest run`.
- [ ] Added coverage for error cases (401, 403, 400, 404, 500).
- [ ] Verified zero hardcoded outputs or facade logic.
- [ ] Confirmed full repository test suite (`npm test`) passes with no regressions.

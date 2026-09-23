# Handoff Report — Sandbox & Onboarding Survey Explorer (Milestone R2 & R4)

**Agent**: Sandbox & Onboarding Survey Explorer  
**Working Directory**: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_sandbox_1`  
**Target Milestone**: R2 (Self-Service Demo Sandbox & Instant Trial Tenant Provisioning) and R4 (Controlled Stack & Tenant Safeguards)  
**Parent Agent**: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`  
**Timestamp**: 2026-09-17T15:31:00Z  

---

## 1. Observation

### 1.1 Database Schema & Multi-Tenancy Architecture
- **Schema File**: `prisma/schema.prisma`
  - **`Tenant`** (lines 400–418):
    ```prisma
    model Tenant {
      id               String             @id @default(cuid())
      name             String
      companyName      String
      createdAt        DateTime           @default(now())
      updatedAt        DateTime           @updatedAt
      users            TenantMembership[]
      loanApplications LoanApplication[]
      kycDocuments     KycDocument[]
      messages         Message[]
      auditLogs        AuditLog[]
      idempotencyKeys  IdempotencyKey[]
      workflows        Workflow[]
      apiKeys          ApiKey[]
      invitations      Invitation[]
      settingsChanges  SettingsChange[]

      @@map("tenants")
    }
    ```
  - **`TenantMembership`** (lines 420–429):
    ```prisma
    model TenantMembership {
      id       String @id @default(cuid())
      tenantId String
      userId   String
      role     String @default("MEMBER")
      tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      @@unique([tenantId, userId])
      @@map("tenant_memberships")
    }
    ```
  - **`LoanApplication`** (lines 431–450):
    ```prisma
    model LoanApplication {
      id             String        @id @default(cuid())
      tenantId       String
      applicantName  String
      applicantPhone String
      loanAmount     Decimal       @db.Decimal(15, 2)
      loanPurpose    String?
      status         String        @default("SUBMITTED")
      assignedToId   String?
      createdAt      DateTime      @default(now())
      updatedAt      DateTime      @updatedAt
      tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      kycDocuments   KycDocument[]
      messages       Message[]
      auditLogs      AuditLog[]

      @@index([tenantId])
      @@index([tenantId, status])
      @@map("loan_applications")
    }
    ```
  - **`AuditLog`** (lines 473–487):
    ```prisma
    model AuditLog {
      id                String           @id @default(cuid())
      tenantId          String
      loanApplicationId String?
      action            String
      metadata          Json?
      actorId           String?
      createdAt         DateTime         @default(now())
      tenant            Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
      loanApplication   LoanApplication? @relation(fields: [loanApplicationId], references: [id])

      @@index([tenantId])
      @@index([tenantId, loanApplicationId])
      @@map("audit_logs")
    }
    ```

### 1.2 Authentication, RBAC & Tenant Resolution
- **File**: `src/lib/ai-assist/server-auth.ts`
  - Lines 17–21 define authorized compliance roles:
    ```typescript
    const AUTHORIZED_ROLES = new Set(["ADMIN", "OWNER", "COMPLIANCE", "OPERATOR"]);

    function isAuthorized(role?: string | null): boolean {
      return role ? AUTHORIZED_ROLES.has(role.trim().toUpperCase()) : false;
    }
    ```
  - Lines 51–79 resolve tenant identity strictly from `prisma.tenantMembership`:
    ```typescript
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { ok: false, response: authResult.response };
    }

    const membership = await prisma.tenantMembership.findFirst({
      where: { userId },
      select: { tenantId: true, role: true },
    });

    if (!membership || !membership.tenantId) {
      return {
        ok: false,
        response: errorResponse(403, "FORBIDDEN", "Tenant membership required"),
      };
    }
    ```
- **Existing User Registration**: `src/app/actions/auth.ts` (lines 41–49):
  ```typescript
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "user",
    },
  });
  ```
  *Observed Gap*: Standard registration assigns `role: "user"` and does NOT create a `Tenant` or `TenantMembership`. When this user attempts to access `/dashboard/reviews`, `resolveComplianceAuth` returns `403 Forbidden` because no `TenantMembership` exists and `"user"` is not in `AUTHORIZED_ROLES`.

### 1.3 Exception Review UI & Upstream Compliance API
- **Exception Review Queue**: `src/app/dashboard/reviews/page.tsx`
  - Fetches `/api/compliance/reviews?state=...&limit=50&offset=0` (lines 49–62).
  - Handles all 10 states: `loading`, `empty`, `success`, `400`, `401`, `403`, `404`, `409`, `429`, `503` (lines 61–146).
  - Uses TanStack DataTable displaying `brief_id`, `exception_id`, `queue_state` (`pending_review` vs `annotated`), and `sor_status_unchanged`.
- **Exception Review Detail**: `src/app/dashboard/reviews/[briefId]/page.tsx`
  - Fetches `/api/compliance/reviews/[briefId]` (lines 78–83).
  - Renders AI Advisory brief output (risk level, policy citations, suggested remediation, analysis notes), Source-of-Record (SOR) immutability guarantee badge, and operator annotation log (lines 380–520).
  - Submits operator annotations via `POST /api/compliance/reviews/[briefId]/annotations` with client-generated `Idempotency-Key` (lines 176–230).
- **Compliance API Routes**:
  - `POST /api/compliance/briefs`: Creates advisory brief upstream for an exception (`POST /v1/compliance-review-brief`).
  - `GET /api/compliance/reviews`: Queries upstream review queue (`GET /v1/review-queue`).
  - `GET /api/compliance/reviews/[briefId]`: Queries upstream brief detail (`GET /v1/review-queue/{brief_id}`).
  - `POST /api/compliance/reviews/[briefId]/annotations`: Submits annotation upstream (`POST /v1/review-queue/{brief_id}/annotations`).
- **Audit Logging Gap Observed in `src/app/api/compliance/reviews/[briefId]/annotations/route.ts`**:
  - Lines 67–75:
    ```typescript
    const data = await addComplianceAnnotation({
      briefId: briefId.trim(),
      annotation: rawAnnotation.trim(),
      tenantId: auth.context.tenantId,
      requestId: resolveRequestId(request),
      idempotencyKey,
    });
    return withCors(successResponse({ success: true, data }), request, METHODS);
    ```
  - *Observation*: The route forwards the annotation upstream to AI-ASSIST, but does NOT write a record into the local Neon PostgreSQL `prisma.auditLog` table. Acceptance Criteria R2 specifically demands: *"supports submitting annotations with live audit logging"*.

### 1.4 Baseline Test & Verification Status
- Full test suite: `npm test` executed with code 0 (39 test files passed, 276 tests passed).
- Credential leak scanner: `npm run test:secrets` executed with code 0 (9/9 checks passed, 0 leaks).
- Static typecheck: `npm run typecheck` executed with code 0 (`tsc --noEmit` clean).

---

## 2. Logic Chain

1. **Premise 1 (Tenancy Partitioning)**: The review queue in AI-ASSIST (`GET /v1/review-queue`) is strictly partitioned by `X-Tenant-ID`. For a newly provisioned tenant, the review queue will be empty unless synthetic exception briefs are seeded upstream via `POST /v1/compliance-review-brief` using that tenant's ID.
2. **Premise 2 (Database State in Neon)**: Neon PostgreSQL maintains `tenants`, `tenant_memberships`, `loan_applications`, and `audit_logs`. A trial user must have a `TenantMembership` record with `role` matching `["ADMIN", "OWNER", "COMPLIANCE", "OPERATOR"]` for `resolveComplianceAuth` to allow access to `/api/compliance/*`.
3. **Premise 3 (Zero-Friction Onboarding & < 3 Min TTFE)**:
   - If an onboarding flow requires manual email confirmation, KYC uploads, or complex multi-step form submissions, operator friction exceeds 10 minutes.
   - By creating an automated 1-click trial provisioning workflow (`/sandbox` or `/trial`), a compliance officer selects their institution (FairMoney, Carbon, Renmoney, etc.), instantly receives an isolated tenant partition in Neon, has 3 pre-configured Nigerian fintech synthetic exceptions seeded both in Neon and upstream AI-ASSIST, and is immediately redirected to `/dashboard/reviews`.
   - The entire flow from clicking "Launch Sandbox" to viewing the queue takes < 15 seconds.
   - Inspecting the top advisory brief takes ~60 seconds.
   - Typing or choosing a sign-off rationale and clicking "Submit Annotation" takes ~30 seconds.
   - Total time-to-first-reviewed-exception (TTFE) is ~1 minute 45 seconds to 2 minutes 15 seconds, comfortably beating the < 3 minute requirement.
4. **Premise 4 (Enforcing R4 Safeguards)**:
   - *Tenant Isolation*: Authoritative resolution must remain server-side. The trial tenant ID is bound to the user's `TenantMembership` upon creation. In subsequent requests, `resolveComplianceAuth` reads `auth()` -> `prisma.tenantMembership`, rejecting any client-supplied tenant headers.
   - *Prisma Decimal Precision*: All synthetic transaction records (`LoanApplication.loanAmount`) must use `new Prisma.Decimal(...)` (e.g. `₦350,000.00`), never JavaScript floats.
   - *Fail-Closed Security*: Inbound requests with missing auth fail with 401; unmapped roles fail with 403; cross-tenant brief lookups upstream return 404.
   - *Secret Boundary*: Upstream `AI_ASSIST_API_TOKEN` is never sent to the browser and is only accessed inside Node.js runtime API handlers via `getAiAssistConfig()`.
5. **Premise 5 (Audit Log Non-Repudiation)**:
   - When an operator submits an annotation, writing to `prisma.auditLog` with `action: "COMPLIANCE_ANNOTATION_SUBMITTED"`, `tenantId`, `actorId`, and cryptographic hash/metadata fulfills both R2 ("live audit logging") and R3 (CBN/SEC immutable audit logs).

---

## 3. Caveats

1. **Upstream AI-ASSIST Service Availability**:
   - In production, upstream AI-ASSIST runs on Render (`https://shadowspark-ai-api.onrender.com`). If the Render service is cold-starting, the first upstream request may take up to 45 seconds. The client already implements `AbortSignal.timeout` and proper status 504 mapping.
   - In local or CI test runs, `UpstreamContractSimulator` (`tests/e2e/upstream-simulator.ts`) is used, which runs instantly with zero network latency.
2. **Database Connection Limits on Neon Serverless**:
   - Neon PostgreSQL pooler connection limits must be respected. Provisioning should execute all database mutations in a single compact `prisma.$transaction` block.
3. **No Code Written (Explorer Mandate)**:
   - In accordance with the Explorer archetype instructions, no application code was created or edited during this survey. All proposed implementations are documented as specifications for the implementing agents.

---

## 4. Conclusion & Implementation Recommendations for Milestone R2

### Recommended Architecture:

#### Component A: Dedicated Sandbox Onboarding Engine (`src/app/actions/sandbox.ts` or `/api/sandbox/provision`)
Create a dedicated server action / API endpoint `provisionTrialTenant`:
- **Inputs**:
  - `institutionSlug`: Selected from Batch 01 presets (`"fairmoney"`, `"carbon"`, `"renmoney"`, `"branch"`, `"kuda"`, `"palmpay"`, `"quidax"`, `"busha"`, `"yellowcard"`, `"flitaa"`) or `"custom"`.
  - `companyName`: e.g. `"FairMoney Microfinance Bank"`
  - `operatorEmail`: e.g. `compliance@fairmoney-demo.ng`
  - `operatorName`: e.g. `"Lead Compliance Officer"`
  - `operatorPassword`: (optional; auto-generated or user provided)
- **Database Transaction (`prisma.$transaction`)**:
  1. Create isolated `Tenant`:
     - `name`: `trial-${institutionSlug}-${Date.now().toString(36)}`
     - `companyName`: `companyName`
  2. Create or find `User`:
     - `email`: `operatorEmail`
     - `name`: `operatorName`
     - `password`: hashed bcrypt password
     - `role`: `"COMPLIANCE"`
  3. Create `TenantMembership`:
     - `tenantId`: `tenant.id`
     - `userId`: `user.id`
     - `role`: `"COMPLIANCE"` (authorized role)
  4. Create 3 Synthetic `LoanApplication` records using `Prisma.Decimal`:
     - **Exception 1 (`ex_bvn_mismatch`)**:
       - `applicantName`: `"Adaeze Okonkwo"`
       - `applicantPhone`: `"+2348011223344"`
       - `loanAmount`: `new Prisma.Decimal(350000.00)`
       - `loanPurpose`: `"Working Capital — MSME Retail"`
       - `status`: `"UNDER_REVIEW"`
     - **Exception 2 (`ex_structuring_velocity`)**:
       - `applicantName`: `"Emeka Nwosu"`
       - `applicantPhone`: `"+2348022334455"`
       - `loanAmount`: `new Prisma.Decimal(1250000.00)`
       - `loanPurpose`: `"Inventory Financing"`
       - `status`: `"KYC_PENDING"`
     - **Exception 3 (`ex_pep_flag`)**:
       - `applicantName`: `"Babajide Alabi"`
       - `applicantPhone`: `"+2348033445566"`
       - `loanAmount`: `new Prisma.Decimal(850000.00)`
       - `loanPurpose`: `"Equipment Acquisition"`
       - `status`: `"UNDER_REVIEW"`
  5. Create initial provisioning `AuditLog`:
     - `tenantId`: `tenant.id`
     - `action`: `"TRIAL_TENANT_PROVISIONED"`
     - `actorId`: `user.id`
     - `metadata`: `{ institutionSlug, companyName, syntheticLoanCount: 3 }`
- **Upstream AI-ASSIST Brief Seeding**:
  - For each synthetic exception, immediately call:
    ```typescript
    await createComplianceBrief({
      exceptionId: `ex_${institutionSlug}_${exKey}`,
      tenantId: tenant.id,
      requestId: `seed-${randomUUID()}`,
      idempotencyKey: `seed-${tenant.id}-${exKey}`,
    });
    ```
  - This guarantees that when the operator opens `/dashboard/reviews`, the queue is pre-populated with 3 active briefs in `pending_review` state!
- **Session Auto-Sign In**:
  - Calls `signIn("credentials", ...)` or sets auth cookies so the operator immediately enters authenticated state without a separate login barrier.
  - Redirects directly to `/dashboard/reviews`.

#### Component B: Local Audit Log Emission on Annotation Submission
In `src/app/api/compliance/reviews/[briefId]/annotations/route.ts`:
- After `await addComplianceAnnotation(...)` succeeds, execute:
  ```typescript
  await prisma.auditLog.create({
    data: {
      tenantId: auth.context.tenantId,
      actorId: auth.context.userId,
      action: "COMPLIANCE_ANNOTATION_SUBMITTED",
      metadata: {
        briefId: briefId.trim(),
        annotation: rawAnnotation.trim(),
        idempotencyKey,
        submittedAt: new Date().toISOString(),
      },
    },
  });
  ```
- This guarantees compliance with SEC Circular 26-1 audit logging requirements and satisfies R2 acceptance criteria.

#### Component C: Interactive Sandbox Onboarding UI (`src/app/(marketing)/sandbox/page.tsx`)
- Sleek, low-friction onboarding screen with 10 Batch 01 target institution quick-select badges.
- Live progress indicator showing:
  1. Creating cryptographic Neon PostgreSQL tenant partition (done in ~300ms)
  2. Generating synthetic loan exception dataset (done in ~200ms)
  3. Synthesizing AI-ASSIST compliance briefs (done in ~800ms)
  4. Launching Exception Review Co-Pilot (< 2 seconds total)
- Guided walk-through banner at top of `/dashboard/reviews` highlighting the 3-step operator flow:
  1. *"Select an exception"*
  2. *"Review AI Advisory synthesis & policy citations"*
  3. *"Submit signed annotation"*

---

## 5. Verification Method

To independently verify these findings and any subsequent implementation:

1. **Schema and Prisma Client Integrity**:
   ```bash
   npx prisma validate
   npm run typecheck
   ```
   *Expected Outcome*: Zero schema validation errors, zero TypeScript errors.

2. **Automated Test Suite**:
   ```bash
   npm test
   ```
   *Expected Outcome*: All 39 test files and 276 Vitest tests pass without regressions.

3. **Multi-Tenant Isolation & Security**:
   ```bash
   npm test tests/tenant-isolation.test.ts
   npm test tests/api/compliance.test.ts
   npm test tests/e2e/compliance-flow.test.ts
   ```
   *Expected Outcome*: Replay tests pass, cross-tenant brief access returns 404, unauthenticated calls return 401, missing memberships return 403.

4. **Secret Leak Guard**:
   ```bash
   npm run test:secrets
   ```
   *Expected Outcome*: 9/9 secret checks pass with zero leaks.

5. **Invalidation Conditions**:
   - If tenant identity is ever retrieved from client URL query parameters or request body instead of `session` / `jwt`, this design is invalidated.
   - If floating point numbers are used in place of `Prisma.Decimal` for monetary values, this design is invalidated.
   - If `POST /api/compliance/reviews/[briefId]/annotations` fails to record an immutable `AuditLog` in Neon PostgreSQL, the SEC Circular 26-1 compliance criteria are invalidated.

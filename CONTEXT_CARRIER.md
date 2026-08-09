@workspace CONTEXT CARRIER — SHADOWSPARK FINTECH OS v0.9

## CURRENT STATE SUMMARY

**Frontend:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query, deployed via Vercel.
**Backend:** Node.js, Prisma ORM, PostgreSQL, Redis, BullMQ, OpenAI API, Twilio.
**Status:** Foundation complete. Security fixes merged (idempotency, JWT tenant auth, API proxy, safe JSON parsing). Frontend calling backend via `/api/proxy/*`.

## TECH STACK (LOCKED — DO NOT CHANGE)

- Runtime: Node.js 20 LTS
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- Database: PostgreSQL 15 (Neon or self-hosted)
- ORM: Prisma 5.x
- Cache/Queue: Redis (BullMQ + ioredis)
- Auth: JWT (jsonwebtoken), bcryptjs (cost 12)
- Validation: Zod (all inputs)
- HTTP Client: Native fetch (frontend), fetch (backend)
- AI: OpenAI GPT-4 (migrating to AfroLLM v1)
- Messaging: Twilio (WhatsApp, SMS)
- Storage: Cloudflare R2 (S3-compatible)
- OCR: Tesseract.js (local) or external API
- Logging: Pino (structured JSON)
- Testing: Vitest + Playwright
- Deployment: Docker (Alpine), Vercel (frontend), Railway/Render/AWS (backend)

## DATABASE SCHEMA (CURRENT)

### Core Tables
- **Tenant** (id, name, slug UNIQUE, logoUrl, primaryColor, plan, status, settings Json, createdAt, updatedAt)
- **TenantApiKey** (id, tenantId FK, name, keyHash, permissions Json, lastUsedAt, expiresAt)
- **User** (id, tenantId FK, email, passwordHash, firstName, lastName, role, status, lastLoginAt)

### Fintech OS
- **LoanApplication** (id, tenantId FK, applicantPhone, applicantName, applicantEmail, bvn ENCRYPTED, loanAmount Decimal, loanPurpose, status, assignedOfficerId FK, interestRate, tenureMonths, monthlyRepayment, totalRepayable, disbursementDate, metadata Json, createdAt, updatedAt)
- **KycDocument** (id, tenantId FK, loanApplicationId FK, type, status, fileUrl, fileHash, ocrData Json, verificationProvider, verificationResponse Json, reviewedById FK, reviewedAt)
- **LoanRepayment** (id, tenantId FK, loanApplicationId FK, amount Decimal, dueDate, paidDate, status, paymentMethod, transactionReference, reminderCount, lastReminderSentAt)

### Platform
- **Message** (id, tenantId FK, loanApplicationId FK, channel, direction, externalId, from, to, body, mediaUrl, status, metadata Json, sentAt, deliveredAt, readAt)
- **Workflow** (id, tenantId FK, name, description, definition Json [nodes+edges], status, triggerType, version, createdById FK)
- **WorkflowExecution** (id, tenantId FK, workflowId FK, status, context Json, startedAt, completedAt, errorMessage, retryCount)
- **AuditLog** (id, tenantId FK, userId FK, action, entityType, entityId, oldValues Json, newValues Json, ipAddress, userAgent)

### Indexes (Critical)
- Tenant.slug UNIQUE
- User.tenantId + email UNIQUE composite
- LoanApplication.tenantId + status
- LoanApplication.applicantPhone
- KycDocument.loanApplicationId + type
- Message.tenantId + externalId
- AuditLog.tenantId + createdAt
- AuditLog.entityType + entityId

## ARCHITECTURE DECISIONS (NON-NEGOTIABLE)

1. **Multi-tenancy:** Row-level security via `tenantId` on every table. Prisma Client Extensions auto-append `where: { tenantId }`.
2. **Tenant Resolution:** JWT payload is the ONLY authoritative tenant source. `X-Tenant-Slug` is a routing hint for logging only. Mismatch = 403.
3. **Idempotency:** All mutations require `Idempotency-Key` header. Backend stores in Redis (24h TTL). Duplicate key = cached response. No key = 400.
4. **Retry Policy:** GET auto-retries (2x). Mutations NEVER auto-retry. User must manually retry (generates new idempotency key).
5. **BVN Encryption:** AES-256-GCM with ENCRYPTION_KEY env var. Never logged, never returned in full to client (masked: ******1234).
6. **File Storage:** R2/S3 with key pattern `{tenantId}/{loanId}/{docType}/{timestamp}-{filename}`.
7. **Async Processing:** All external calls (Twilio, OCR, credit bureau) queued via BullMQ. HTTP responses never block on external APIs.
8. **Webhook Response Time:** All webhooks respond <2s (acknowledge, process async).
9. **Audit Immutability:** AuditLog table is append-only. No UPDATE or DELETE operations allowed.
10. **Monetary Precision:** All money fields use Prisma `Decimal`, never Float.

## API CONTRACT (WHAT THE FRONTEND EXPECTS)

### Auth
- POST /api/v1/auth/register → { user, token }
- POST /api/v1/auth/login → { user, token }
- POST /api/v1/auth/refresh → { token }
- GET /api/v1/auth/me → { user, tenant }

### Loans
- GET /api/v1/loans?status=&search=&officerId=&minAmount=&maxAmount=&dateFrom=&dateTo=&sortBy=&sortOrder=&page=&limit= → PaginatedResponse<LoanApplication[]>
- GET /api/v1/loans/:id → ApiResponse<LoanApplication> (includes kycDocuments, repayments, assignedOfficer, messages, auditLogs)
- POST /api/v1/loans → ApiResponse<LoanApplication> (requires Idempotency-Key)
- PATCH /api/v1/loans/:id → ApiResponse<LoanApplication> (requires Idempotency-Key)
- DELETE /api/v1/loans/:id → 204 (requires Idempotency-Key)
- POST /api/v1/loans/:id/assign → ApiResponse<LoanApplication>

### KYC
- GET /api/v1/kyc/pending?limit=&offset= → ApiResponse<KycDocument[]>
- POST /api/v1/kyc/:id/verify → ApiResponse<KycDocument> (requires Idempotency-Key)
- POST /api/v1/kyc/:id/request-info → ApiResponse (requires Idempotency-Key)
- POST /api/v1/kyc/:id/ocr → 202 Accepted { jobId }

### Messages
- GET /api/v1/messages/conversations → ApiResponse<Conversation[]>
- GET /api/v1/messages?loanApplicationId=&channel=&page=&limit= → PaginatedResponse<Message[]>
- POST /api/v1/messages/send → 202 Accepted { messageId } (requires Idempotency-Key)
- POST /api/v1/webhooks/twilio → 200 XML <Response/> (must respond <2s)
- POST /api/v1/webhooks/twilio/status → 200

### Workflows
- GET /api/v1/workflows → PaginatedResponse<Workflow[]>
- GET /api/v1/workflows/:id → ApiResponse<Workflow>
- POST /api/v1/workflows → ApiResponse<Workflow> (requires Idempotency-Key)
- PATCH /api/v1/workflows/:id → ApiResponse<Workflow>
- DELETE /api/v1/workflows/:id → 204
- POST /api/v1/workflows/:id/execute → 202 Accepted { executionId }
- GET /api/v1/workflows/:id/executions → PaginatedResponse<WorkflowExecution[]>

### Tenant/Admin
- GET /api/v1/tenant → ApiResponse<Tenant>
- PATCH /api/v1/tenant → ApiResponse<Tenant>
- GET /api/v1/tenant/team → ApiResponse<User[]>
- POST /api/v1/tenant/team/invite → ApiResponse (requires Idempotency-Key)
- GET /api/v1/tenant/api-keys → ApiResponse<TenantApiKey[]>
- POST /api/v1/tenant/api-keys → ApiResponse<{ key: string }> (returns full key ONCE)
- DELETE /api/v1/tenant/api-keys/:id → 204

### Analytics
- GET /api/v1/analytics/dashboard?from=&to= → ApiResponse<DashboardStats>
- GET /api/v1/analytics/loans?from=&to=&groupBy= → ApiResponse<TimeSeriesData[]>
- GET /api/v1/analytics/export?from=&to=&format= → 202 { downloadUrl }

### Audit
- GET /api/v1/audit-logs?page=&limit=&dateFrom=&dateTo=&userId=&action=&entityType= → PaginatedResponse<AuditLog[]>
- GET /api/v1/audit-logs/:entityType/:entityId → ApiResponse<AuditLog[]>

### Health
- GET /api/health → { status, services: { database, redis }, timestamp }
- GET /api/ready → { status, checks } (readiness probe)

## BULLMQ QUEUES & WORKERS

| Queue | Worker | Purpose |
|-------|--------|---------|
| `message.send` | messaging.worker.ts | Send WhatsApp/SMS via Twilio |
| `kyc.ocr` | kyc.worker.ts | OCR extraction from documents |
| `workflow.execute` | workflow.worker.ts | Execute workflow nodes |
| `notification.send` | notification.worker.ts | Email/Slack alerts |
| `webhook.deliver` | webhook.worker.ts | Deliver webhooks to client endpoints |

All workers: retry 3x with exponential backoff, dead-letter queue after max retries, structured logging, tenant-scoped Prisma queries.

## FRONTEND INTEGRATION POINTS

The frontend expects:
1. All API responses wrapped in `{ success, data, meta: { timestamp, requestId } }`
2. All errors wrapped in `{ success: false, error: { code, message, details?, requestId } }`
3. JWT stored in localStorage as `shadowspark_token`
4. Bearer token in `Authorization` header
5. `X-Tenant-Slug` as routing hint (backend ignores for auth)
6. `Idempotency-Key` on all mutations (generated as `{prefix}-${uuid}`)
7. `/api/proxy/*` routes forwarded to backend (same-origin, no CORS)

## SECURITY CHECKLIST (MUST VERIFY)

- [ ] All Prisma queries include `where: { tenantId: req.tenantId }`
- [ ] No route uses `req.headers['x-tenant-slug']` for authorization
- [ ] All mutation routes enforce `Idempotency-Key` presence
- [ ] BVN encrypted at rest, masked in transit
- [ ] Passwords hashed with bcrypt (cost 12), never logged
- [ ] JWT secret rotated, expiry 7 days, refresh token rotation
- [ ] API keys hashed (bcrypt), never returned in full after creation
- [ ] File uploads: size limit 10MB, MIME whitelist, virus scan
- [ ] Rate limiting per tenant tier (Redis sliding window)
- [ ] CORS: only allow known frontend origins
- [ ] Security headers: HSTS, X-Frame-Options, CSP, etc.
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] Input validation: Zod on ALL routes, no raw SQL

## WHAT'S ALREADY DONE

✅ Multi-tenant Prisma schema with RLS extension
✅ Tenant resolution middleware (subdomain, header, API key)
✅ BVN encryption utility
✅ Zod schemas for all JSON fields
✅ Safe API client with retry discipline
✅ API proxy route for same-origin forwarding
✅ Idempotency helper (Redis-based)
✅ JWT auth middleware with tenant isolation
✅ Enhanced health check (DB + Redis)
✅ Frontend auth hooks (useAuth, useLogin, useLogout)
✅ Frontend loan hooks (useLoans, useLoan, useCreateLoan, useUpdateLoan)
✅ Frontend query client with error handling

## WHAT REMAINS (PRIORITY ORDER)

### P0 — Revenue Critical (Do First)
1. Loan CRUD API routes (POST, GET, PATCH, DELETE, assign)
2. KYC pipeline API (pending queue, verify, reject, request-info, OCR trigger)
3. Messaging API (conversations, send, Twilio webhooks)
4. BullMQ workers (messaging, kyc.ocr)

### P1 — Platform Differentiator
5. Workflow CRUD API
6. Workflow execution engine (DAG parser, node handlers, condition evaluator)
7. Workflow execution worker

### P2 — Enterprise Sales Enablement
8. Analytics aggregation API (dashboard stats, time series, export)
9. Audit log API (immutable, searchable)
10. Real-time notifications (SSE or WebSocket)

### P3 — Administration
11. Tenant settings API
12. Team management (invite, roles, status)
13. API key management (generate, revoke, blacklist)
14. Webhook management (CRUD, test, delivery worker)

### P4 — Production Hardening
15. Docker + docker-compose
16. GitHub Actions CI/CD
17. Monitoring (Pino metrics, Sentry, health probes)
18. Performance (connection pooling, query optimization, caching)
19. Documentation (API.md, DEPLOYMENT.md, CONTRIBUTING.md)

## IMMEDIATE NEXT TASK

Based on the current state, implement the next logical piece of work. Do not skip ahead. Do not change tech stack. Do not debate architecture — decisions are locked.

If starting fresh: implement P0 Loan CRUD API routes with full idempotency, tenant isolation, audit logging, and tests.

If continuing: pick up from the last merged PR and implement the next unbuilt item in priority order.

Be opinionated. Write production code. Include tests. Never expose stack traces. Always return structured errors. Never trust client input.

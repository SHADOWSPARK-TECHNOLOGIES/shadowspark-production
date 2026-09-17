# Specification Audit Report: AI-ASSIST v1.1.0 Contract & Local Adapter Reconcile

**Audit Agent**: `AI_ASSIST_CONTRACT_AUDITOR` (`teamwork_preview_spec_miner_contract_1`)  
**Parent Orchestrator**: `orchestrator_1` (`e1df41dd-f8ac-4c2f-8937-0ec8a3377e8a`)  
**Milestone**: Milestone 2 (R2) — AI-ASSIST Contract Verification  
**Date**: 2026-09-16T13:51:30Z  
**Upstream Repository**: `/home/moronto/Documents/Codex/2026-09-14/re/work/ai-assist` (`https://github.com/Morontowonderz/AI-ASSIST.git`)  
**Frozen Contract Commit**: `e4385628c9fffcacc904d7b963a594aa206015bf` (PR #2 merge commit into `main`)  
**Current Upstream Remote Commit**: `38a17827251f41861ce5a76617d499486d2de0c2` (`origin/main`, `origin/HEAD`)  
**Live Deployed Service**: `https://shadowspark-ai-api.onrender.com` (running v1.1.0 commit `e438562`)  
**Local Consumer Repository**: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production` (Branch: `feat/ai-assist-adapter`)  

---

## 1. Observation

### 1.1 Upstream Specification Provenance & Git Invariants
- Upstream Git log confirms PR #2 was merged into `main` at commit `e4385628c9fffcacc904d7b963a594aa206015bf`:
  ```
  commit e4385628c9fffcacc904d7b963a594aa206015bf
  Merge: 209bf97 1439c04
  Author: Moronto Mornica <87345186+Morontowonderz@users.noreply.github.com>
  Date:   Wed Sep 16 13:41:12 2026 +0100
      Merge pull request #2 from Morontowonderz/feat/multi-tenant-isolation
      feat: multi-tenant isolation, idempotency, and v1.1.0 frozen API contract
  ```
- Subsequent commit `38a17827251f41861ce5a76617d499486d2de0c2` on `origin/main` records:
  `docs: open ADAPTER_WRITE_GATE following verified live Render v1.1.0 deployment`.
- Upstream contract files:
  - `docs/engineering/API_CONTRACT.md`: Frozen v1.1.0 API specification.
  - `docs/engineering/ARCHITECTURE.md`: Core architectural principles (zero-trust tenancy, SoR immutability, idempotency engine, WAL concurrency).
  - `docs/engineering/DECISIONS.md`: ADR 001 through ADR 006.
  - `docs/engineering/CURRENT_STATE.md`: System state, Render deployment parameters.
  - `docs/engineering/HANDOFF.md`: Integration handoff instructions for Codex.
  - `shadowspark_api/app.py`: FastAPI application router and endpoint definitions.
  - `shadowspark_api/auth.py`: Authentication, principal extraction, scope checking.
  - `shadowspark_api/database.py`: SQLite persistence, WAL mode, transaction isolation, idempotency store.
  - `shadowspark_api/schemas.py`: Pydantic request and response models (`extra="forbid"`).
  - `tests/test_api.py`, `tests/test_auth.py`: Pytest test suite (63 passing tests).
  - `scripts/render_e2e.sh`: 6-stage live E2E verification script.

### 1.2 Local Consumer Adapter Files
- `src/lib/ai-assist/types.ts`: TypeScript interface definitions for upstream models and client params.
- `src/lib/ai-assist/auth.ts`: Environment validation, server-to-server header assembly (`buildAiAssistHeaders`), request ID resolution, client idempotency extraction.
- `src/lib/ai-assist/client.ts`: Typed fetch client (`createComplianceBrief`, `getComplianceReview`, `addComplianceAnnotation`).
- `src/lib/ai-assist/errors.ts`: Upstream status mapping (`mapUpstreamStatus`), error class (`AiAssistError`), static safe messages, error response formatting (`aiAssistErrorResponse`).
- `src/app/api/compliance/briefs/route.ts`: Handler for `POST /api/compliance/briefs`.
- `src/app/api/compliance/reviews/[briefId]/route.ts`: Handler for `GET /api/compliance/reviews/[briefId]`.
- `src/app/api/compliance/reviews/[briefId]/annotations/route.ts`: Handler for `POST /api/compliance/reviews/[briefId]/annotations`.
- `tests/ai-assist-client.test.ts`: 19 Vitest unit tests for the client layer.
- `tests/api/compliance.test.ts`: 16 Vitest unit tests for the Next.js API route layer. All 35 tests pass cleanly in 444ms.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | System | Health Probe (`GET /healthz`) | Public liveness & readiness check | None | HTTP 200 `{"status": "ok"}` | None (unauthenticated) | `docs/engineering/API_CONTRACT.md:33`, `shadowspark_api/app.py:73` |
| 2 | Compliance Briefs | Create Brief (`POST /v1/compliance-review-brief`) | Generates or idempotently replays a deterministic compliance evaluation brief | Headers: `Authorization`, `X-Tenant-Slug`/`X-Tenant-ID`, `Idempotency-Key` (max 128 chars), optional `X-Request-ID`. Body: `{"exception_id": str, "tenant_id"?: str}` | HTTP 201 `BriefResponse` (`brief_id`, `output`, `tool_trace`, `replayed`) | 400 (bad slug/missing key/tenant mismatch), 401 (auth), 403 (scope), 404 (not found/foreign tenant), 409 (idem conflict), 422 (raw PII), 429 (LLM06 budget trip) | `docs/engineering/API_CONTRACT.md:46`, `shadowspark_api/app.py:80` |
| 3 | Review Queue | List Review Queue (`GET /v1/review-queue`) | Retrieves paginated, sorted review queue summaries for the authenticated tenant | Headers: `Authorization`, `X-Tenant-Slug`/`X-Tenant-ID`. Query params: `limit` (default 50, 1-100), `offset` (default 0, ge 0), `state` (optional: `pending_review` or `annotated`) | HTTP 200 `ReviewQueueListResponse` (`items: list[ReviewQueueSummary]`, `total: int`, `limit: int`, `offset: int`) | 400 (invalid slug/state/pagination), 401 (auth), 403 (scope) | `docs/engineering/API_CONTRACT.md:79`, `shadowspark_api/app.py:112`, commit `db9d309` |
| 4 | Review Queue | Inspect Review Item (`GET /v1/review-queue/{brief_id}`) | Inspects a single tenant-scoped review queue entry with brief payload and full audit annotation trail | Headers: `Authorization`, `X-Tenant-Slug`/`X-Tenant-ID`. Path param: `brief_id: str` | HTTP 200 `ReviewQueueResponse` (`brief_id`, `tenant_id`, `exception_id`, `output`, `queue_state`, `sor_status_unchanged`, `annotations`, `created_at`, `updated_at`) | 400 (invalid slug), 401 (auth), 403 (scope), 404 (not found or foreign tenant access) | `docs/engineering/API_CONTRACT.md:107`, `shadowspark_api/app.py:133` |
| 5 | Review Queue | Append Operator Annotation (`POST /v1/review-queue/{brief_id}/annotations`) | Appends an immutable audit annotation to the review queue entry and advances `queue_state` to `annotated` | Headers: `Authorization`, `X-Tenant-Slug`/`X-Tenant-ID`, `Idempotency-Key` (max 128 chars). Path param: `brief_id: str`. Body: `{"annotation": str}` (1-2000 chars) | HTTP 200 `ReviewQueueResponse` with updated annotations list and updated timestamp | 400 (missing key/invalid body/extra fields), 401 (auth), 403 (scope: requires `compliance:review`), 404 (not found), 409 (idem conflict), 422 (raw PII) | `docs/engineering/API_CONTRACT.md:143`, `shadowspark_api/app.py:155` |
| 6 | Tenancy | Tenant Header Dual Support | Accepts either `X-Tenant-Slug` or `X-Tenant-ID` header interchangeably | `X-Tenant-Slug` or `X-Tenant-ID` header value matching `^[a-z0-9][a-z0-9_-]{0,63}$` | Resolved tenant string in Principal context | HTTP 400 if malformed; HTTP 401 in production if omitted | `shadowspark_api/app.py:59-65`, `test_api.py:108` |
| 7 | Tenancy | Production Fail-Closed Tenant Enforcement | In production (`SHADOWSPARK_ENV=production`), requests without a valid tenant header immediately fail closed | Missing or blank tenant header in production | None | HTTP 401 (`AuthenticationError("tenant identifier required in production")`) | `shadowspark_api/auth.py:86`, ADR 001 |
| 8 | Tenancy | Deterministic Dev/Test Tenant Default | In non-production environments, missing tenant header safely defaults to `"tenant_a"` | No tenant header in non-production | Uses `"tenant_a"` | None | `shadowspark_api/auth.py:88`, `test_auth.py:20` |
| 9 | Tenancy | Cross-Tenant Indistinguishable 404 | Accessing resources owned by other tenants returns identical 404 as nonexistent records | Requesting brief or exception belonging to another tenant | HTTP 404 `{"detail": "review not found"}` or `{"detail": "exception not found"}` | Prevents tenant resource enumeration | `shadowspark_api/app.py:88`, `shadowspark_api/database.py:76`, `test_api.py:32` |
| 10 | Security | Bearer Token Sanitization & Fingerprinting | Raw service token is never stored in DB or written to logs; hashed to 12-char SHA256 fingerprint | `Authorization: Bearer <token>` | Principal `key_id: "token:<sha256[:12]>"` | HTTP 401 on invalid token | `shadowspark_api/auth.py:67`, `ARCHITECTURE.md:2.5` |
| 11 | Security | Sensitive PII Guard (`_RAW_ID`) | Rejects payloads and exception IDs containing 11-digit national identity numbers (BVN/NIN) | Any input matching `(?<!\d)\d{11}(?!\d)` | None | HTTP 422 `{"detail": "raw identifier not accepted"}` | `shadowspark_api/app.py:86`, `shadowspark_api/database.py:34` |
| 12 | Security | Database Credential Leak Guard (`_safe`) | SQLite pre-persistence assertion prevents raw `Bearer ` strings or 11-digit numbers from entering SQLite | String/JSON serialization of stored payloads | Passes if clean | `ValueError("sensitive identifier or credential cannot be persisted")` | `shadowspark_api/database.py:34` |
| 13 | Idempotency | Brief Creation Fingerprinting & Replay | Deterministic SHA256 of canonical JSON payload (`sort_keys=True, separators=(',', ':')`) stored with key | Repeated `POST` with matching `Idempotency-Key` and matching body | HTTP 201 with `replayed: true` | HTTP 409 if same key is reused with mismatched payload | `shadowspark_api/database.py:59`, ADR 004 |
| 14 | Idempotency | Annotation Idempotency via Unique Index | Partial unique index `uq_annotations_tenant_brief_idem` on `(tenant_id, brief_id, idempotency_key)` | Repeated `POST` with matching key and annotation text | HTTP 200 with review object (no duplicate insertion) | HTTP 409 if same key is reused with different annotation text | `shadowspark_api/database.py:129`, ADR 004 |
| 15 | Idempotency | Tenant-Scoped Idempotency | Idempotency storage is strictly composite-keyed on `(tenant_id, idempotency_key)` | Two different tenants submitting same `Idempotency-Key` | Both succeed independently without collision | No cross-tenant conflict | `shadowspark_api/database.py:48`, `test_api.py:170` |
| 16 | System of Record | SoR Immutability Invariant | Engine strictly guarantees external banking/SoR data is not mutated | Brief creation and queue ingestion | `sor_status_unchanged: true` (enforced by SQLite `CHECK(sor_status_unchanged=1)`) | SQLite integrity violation if violated | `shadowspark_api/database.py:62`, `ARCHITECTURE.md:2.2` |
| 17 | Observability | Distributed Request Tracing (`X-Request-ID`) | Echoes inbound `X-Request-ID` or generates UUIDv4 hex string; logs to audit trail | Inbound `X-Request-ID` header | Response header `X-Request-ID: <id>` and DB `audit_events.request_id` | Echoed on all responses including errors | `shadowspark_api/app.py:51`, `test_api.py:160` |
| 18 | Storage | Configurable Persistent DB Path | Supports persistent disk mount via `SHADOWSPARK_DB_PATH` environment variable | `SHADOWSPARK_DB_PATH` env var | Initializes SQLite at specified path with WAL mode & 5s timeout | Defaults to `./data/shadowspark.db` if unset | `shadowspark_api/app.py:34`, ADR 002 |

---

## 3. Edge Cases

| # | Feature | Input / Condition | Observed Behavior | Upstream Source Reference |
|---|---|---|---|---|
| 1 | Dual Tenant Header Support | Client provides `X-Tenant-Slug: tenant_a` OR `X-Tenant-ID: tenant_a` | Both headers resolved interchangeably (`raw = x_tenant_slug or x_tenant_id`). | `shadowspark_api/app.py:59`, `test_api.py:108` |
| 2 | Tenant Header Casing | `x-tenant-id`, `X-Tenant-ID`, `X-Tenant-Slug` | Treated identically by Starlette / FastAPI case-insensitive header mapping. | `shadowspark_api/app.py:59` |
| 3 | Invalid Tenant Format | Header containing `invalid/slug!` or characters outside `^[a-z0-9][a-z0-9_-]{0,63}$` | HTTP 400 `{"detail": "invalid tenant identifier"}`. | `shadowspark_api/app.py:63`, `test_api.py:149` |
| 4 | Missing Tenant in Production | `SHADOWSPARK_ENV=production` with missing or blank tenant header | HTTP 401 `{"detail": "authentication failed"}` via fail-closed `AuthenticationError`. | `shadowspark_api/auth.py:86`, `test_auth.py:46`, `test_api.py:90` |
| 5 | Missing Tenant in Dev/Test | `SHADOWSPARK_ENV!=production` with missing tenant header | Deterministically defaults to `"tenant_a"`. Preserves test determinism. | `shadowspark_api/auth.py:88`, `test_auth.py:20` |
| 6 | Tenant Mismatch Header vs Body | Header `X-Tenant-Slug: tenant_a` and body `{"tenant_id": "tenant_b"}` | HTTP 400 `{"detail": "tenant mismatch between header and body"}`. | `shadowspark_api/app.py:84`, `test_api.py:155` |
| 7 | Cross-Tenant Brief Access | Tenant A requests `GET /v1/review-queue/{brief_b_id}` belonging to Tenant B | HTTP 404 `{"detail": "review not found"}`. Identical to nonexistent ID (prevents tenant enumeration). | `shadowspark_api/database.py:76`, `test_api.py:126` |
| 8 | Cross-Tenant Annotation | Tenant A calls `POST /v1/review-queue/{brief_b_id}/annotations` for Tenant B's brief | HTTP 404 `{"detail": "review not found"}`. No update to Tenant B's queue or annotations. | `shadowspark_api/database.py:122`, `test_api.py:136` |
| 9 | Cross-Tenant Exception Prefix | Tenant A passes `exception_id: "tenant_b:ex_009"` | HTTP 404 `{"detail": "exception not found"}`. Indistinguishable from missing exception. | `shadowspark_api/app.py:88`, `test_api.py:32` |
| 10 | Missing Idempotency-Key on POST | Mutating request (`POST /v1/compliance-review-brief` or `POST .../annotations`) without key | HTTP 400 `{"detail": "Idempotency-Key required"}`. | `shadowspark_api/app.py:72`, `test_api.py:100` |
| 11 | Idempotency-Key Length > 128 | Header `Idempotency-Key` with 129 or more characters | HTTP 400 `{"detail": "Idempotency-Key required"}`. | `shadowspark_api/app.py:70` |
| 12 | Brief Idempotent Replay | Repeated `POST` with identical `Idempotency-Key` and matching body | HTTP 201 `BriefResponse` with `replayed: true`. No duplicate brief or review entry created. | `shadowspark_api/database.py:59`, `test_api.py:25` |
| 13 | Brief Idempotency Conflict | Repeated `POST` with identical `Idempotency-Key` but differing `exception_id` | HTTP 409 `{"detail": "idempotency key conflict"}`. | `shadowspark_api/database.py:58`, `test_api.py:46` |
| 14 | Annotation Idempotent Replay | Repeated `POST .../annotations` with identical key and identical annotation text | HTTP 200 `ReviewQueueResponse`. No duplicate annotation row inserted. | `shadowspark_api/database.py:129`, `test_api.py:112` |
| 15 | Annotation Idempotency Conflict | Repeated `POST .../annotations` with identical key but differing annotation text | HTTP 409 `{"detail": "idempotency key conflict"}`. | `shadowspark_api/database.py:130`, `test_api.py:120` |
| 16 | Multi-Tenant Idempotency Isolation | Tenant A and Tenant B use identical `Idempotency-Key` | Both succeed independently; keys are scoped to `(tenant_id, idempotency_key)`. | `shadowspark_api/database.py:48`, `test_api.py:170` |
| 17 | 11-digit Raw National ID (BVN/NIN) | `exception_id` or body contains 11-digit number (`(?<!\d)\d{11}(?!\d)`) | HTTP 422 `{"detail": "raw identifier not accepted"}`. | `shadowspark_api/app.py:86`, `shadowspark_api/database.py:34` |
| 18 | Token Leakage Guard in Database | String containing `"Bearer "` attempted to be persisted to DB | `_safe()` raises `ValueError("sensitive identifier or credential cannot be persisted")`. | `shadowspark_api/database.py:34` |
| 19 | Missing Production Token | `SHADOWSPARK_ENV=production` with `SHADOWSPARK_API_TOKEN` unset or empty | Fails closed on all authenticated routes with HTTP 401 (`AuthenticationError("production authentication token not configured")`). | `shadowspark_api/auth.py:54`, `test_auth.py:65` |
| 20 | Test Capability in Production | Presenting `ss_test_redacted` when `SHADOWSPARK_ENV=production` | HTTP 401 `{"detail": "authentication failed"}`. Test capability rejected in production. | `shadowspark_api/auth.py:55`, `test_auth.py:56` |
| 21 | Key Fingerprinting | Deriving operator ID / audit trail key identifier | In production or custom token: `token:<sha256(token)[:12]>`. Secret token is never stored. | `shadowspark_api/auth.py:67`, `ARCHITECTURE.md:2.5` |
| 22 | Request ID Echoing | Inbound `X-Request-ID: trace-123` passed by client | HTTP response header echoes `X-Request-ID: trace-123`. | `shadowspark_api/app.py:51`, `test_api.py:160` |
| 23 | Review Queue State Filtering | Query `GET /v1/review-queue?state=pending_review` or `?state=annotated` | Returns only items matching requested state. | `shadowspark_api/app.py:126`, `test_api.py:190` |
| 24 | Invalid Review Queue State | Query `GET /v1/review-queue?state=invalid_status` | HTTP 400 `{"detail": "invalid state filter"}`. | `shadowspark_api/app.py:127`, `test_api.py:202` |
| 25 | Review Queue Pagination Defaults | `limit` omitted, `offset` omitted | Defaults to `limit=50`, `offset=0`. Max limit is 100, min is 1. | `shadowspark_api/app.py:118`, `shadowspark_api/database.py:82` |
| 26 | LLM06 Policy Rate Limit / Budget Trip | Exception evaluation triggers `LLM06:2026` budget constraint | HTTP 429 Too Many Requests with brief output having `status: "blocked"` and `risk_flags: ["LLM06:2026"]`. | `shadowspark_api/app.py:101`, `test_api.py:51` |
| 27 | Extra Fields in Request Bodies | Client passes undeclared fields in JSON body for brief or annotation | HTTP 422 Unprocessable Entity (`ConfigDict(extra="forbid")`). | `shadowspark_api/schemas.py:12,18` |

---

## 4. Complete API Specification Inventory

### 4.1 Endpoint Overview
```
GET   /healthz                                      — Public liveness check (200 OK)
POST  /v1/compliance-review-brief                   — Create/replay brief (201 Created / 429 Too Many Requests)
GET   /v1/review-queue                              — List review queue (200 OK)
GET   /v1/review-queue/{brief_id}                   — Inspect specific review (200 OK)
POST  /v1/review-queue/{brief_id}/annotations       — Append audit annotation (200 OK)
```

### 4.2 Endpoint Specifications

#### 4.2.1 `GET /healthz`
- **Method**: `GET`
- **Path**: `/healthz`
- **Auth**: None (public)
- **Headers**: None required
- **Response**: `200 OK`
  ```json
  { "status": "ok" }
  ```

#### 4.2.2 `POST /v1/compliance-review-brief`
- **Method**: `POST`
- **Path**: `/v1/compliance-review-brief`
- **Auth**: Required Bearer capability (`compliance:read` scope)
- **Headers**:
  - `Authorization: Bearer <SHADOWSPARK_API_TOKEN>` (Required)
  - `X-Tenant-Slug: <tenant_id>` OR `X-Tenant-ID: <tenant_id>` (Conditional: mandatory in production)
  - `Idempotency-Key: <string>` (Required: 1-128 chars)
  - `X-Request-ID: <string>` (Optional, echoed back)
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "exception_id": "string",
    "tenant_id": "string (optional)"
  }
  ```
  *Constraint: `model_config = ConfigDict(extra="forbid")`. `exception_id` min 1, max 128. `tenant_id` min 1, max 64. Must not contain raw 11-digit numbers (`(?<!\d)\d{11}(?!\d)`).*
- **Success Response (201 Created)**:
  ```json
  {
    "brief_id": "brief_4a8b79f1...",
    "output": {
      "exception_id": "ex_a_021",
      "status": "review_required",
      "brief": {
        "summary": "Compliance exception evaluation summary...",
        "risk_flags": ["AML_FLAG_01"],
        "recommendation": "escalate"
      }
    },
    "tool_trace": [
      { "tool": "read_exception", "result": "ok" }
    ],
    "replayed": false
  }
  ```
- **Budget Trip Response (429 Too Many Requests)**:
  Returned when `output.status == "blocked"` and `"LLM06:2026"` is present in `output.brief.risk_flags`. Returns JSON body formatted as `BriefResponse`.
- **Error Responses**:
  - `400 Bad Request`: `{"detail": "invalid tenant identifier"}` | `{"detail": "Idempotency-Key required"}` | `{"detail": "tenant mismatch between header and body"}`
  - `401 Unauthorized`: `{"detail": "authentication failed"}`
  - `403 Forbidden`: `{"detail": "scope required"}`
  - `404 Not Found`: `{"detail": "exception not found"}`
  - `409 Conflict`: `{"detail": "idempotency key conflict"}`
  - `422 Unprocessable Entity`: `{"detail": "raw identifier not accepted"}` | Pydantic validation error

#### 4.2.3 `GET /v1/review-queue`
- **Method**: `GET`
- **Path**: `/v1/review-queue`
- **Auth**: Required Bearer capability (`compliance:read` scope)
- **Headers**:
  - `Authorization: Bearer <SHADOWSPARK_API_TOKEN>` (Required)
  - `X-Tenant-Slug: <tenant_id>` OR `X-Tenant-ID: <tenant_id>` (Conditional: mandatory in production)
- **Query Parameters**:
  - `limit`: `integer` (Optional, default 50, min 1, max 100)
  - `offset`: `integer` (Optional, default 0, min 0)
  - `state`: `string` (Optional, allowed values: `"pending_review"`, `"annotated"`)
- **Ordering**: Descending by `created_at` (`ORDER BY q.created_at DESC`)
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "brief_id": "brief_4a8b79f1...",
        "tenant_id": "tenant_a",
        "exception_id": "ex_a_021",
        "queue_state": "pending_review",
        "sor_status_unchanged": true,
        "created_at": "2026-09-16T11:45:00.000000+00:00",
        "updated_at": "2026-09-16T11:45:00.000000+00:00"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"detail": "invalid tenant identifier"}` | `{"detail": "invalid state filter"}`
  - `401 Unauthorized`: `{"detail": "authentication failed"}`
  - `403 Forbidden`: `{"detail": "scope required"}`
  - `422 Unprocessable Entity`: Pydantic Query validation failure (`limit < 1` or `limit > 100` or `offset < 0`)

#### 4.2.4 `GET /v1/review-queue/{brief_id}`
- **Method**: `GET`
- **Path**: `/v1/review-queue/{brief_id}`
- **Auth**: Required Bearer capability (`compliance:read` scope)
- **Headers**:
  - `Authorization: Bearer <SHADOWSPARK_API_TOKEN>` (Required)
  - `X-Tenant-Slug: <tenant_id>` OR `X-Tenant-ID: <tenant_id>` (Conditional: mandatory in production)
- **Path Parameters**:
  - `brief_id`: `string` (Required)
- **Success Response (200 OK)**:
  ```json
  {
    "brief_id": "brief_4a8b79f1...",
    "tenant_id": "tenant_a",
    "exception_id": "ex_a_021",
    "output": {
      "exception_id": "ex_a_021",
      "status": "review_required",
      "brief": {
        "summary": "Compliance exception evaluation summary...",
        "risk_flags": ["AML_FLAG_01"],
        "recommendation": "escalate"
      }
    },
    "queue_state": "annotated",
    "sor_status_unchanged": true,
    "annotations": [
      {
        "annotation_id": "8f3b2a...",
        "operator_id": "token:abc123456789",
        "annotation": "Confirmed exception details with compliance lead.",
        "created_at": "2026-09-16T11:46:12.000000+00:00"
      }
    ],
    "created_at": "2026-09-16T11:45:00.000000+00:00",
    "updated_at": "2026-09-16T11:46:12.000000+00:00"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"detail": "invalid tenant identifier"}`
  - `401 Unauthorized`: `{"detail": "authentication failed"}`
  - `403 Forbidden`: `{"detail": "scope required"}`
  - `404 Not Found`: `{"detail": "review not found"}` (raised when brief does not exist OR belongs to another tenant)

#### 4.2.5 `POST /v1/review-queue/{brief_id}/annotations`
- **Method**: `POST`
- **Path**: `/v1/review-queue/{brief_id}/annotations`
- **Auth**: Required Bearer capability (`compliance:review` scope)
- **Headers**:
  - `Authorization: Bearer <SHADOWSPARK_API_TOKEN>` (Required)
  - `X-Tenant-Slug: <tenant_id>` OR `X-Tenant-ID: <tenant_id>` (Conditional: mandatory in production)
  - `Idempotency-Key: <string>` (Required: 1-128 chars)
  - `X-Request-ID: <string>` (Optional, echoed back)
  - `Content-Type: application/json`
- **Path Parameters**:
  - `brief_id`: `string` (Required)
- **Request Body**:
  ```json
  {
    "annotation": "string (1-2000 characters)"
  }
  ```
  *Constraint: `model_config = ConfigDict(extra="forbid")`. `annotation` min 1, max 2000 characters. Must not contain raw 11-digit numbers or `Bearer `.*
- **Success Response (200 OK)**:
  Returns the updated `ReviewQueueResponse` model (same schema as `GET /v1/review-queue/{brief_id}`).
- **Error Responses**:
  - `400 Bad Request`: `{"detail": "Idempotency-Key required"}` | `{"detail": "invalid tenant identifier"}` | validation errors
  - `401 Unauthorized`: `{"detail": "authentication failed"}`
  - `403 Forbidden`: `{"detail": "scope required"}` (e.g. token lacks `compliance:review`)
  - `404 Not Found`: `{"detail": "review not found"}` (raised when brief does not exist OR belongs to another tenant)
  - `409 Conflict`: `{"detail": "idempotency key conflict"}` (key reused with differing annotation text)
  - `422 Unprocessable Entity`: `{"detail": "raw identifier not accepted"}` | Pydantic validation error

---

## 5. Contract Mismatch Audit (`CONTRACT_MISMATCH`)

Comparing the frozen upstream contract against `shadowspark-production`'s adapter (`src/lib/ai-assist/*`, `src/app/api/compliance/*`, and test fixtures):

### `CONTRACT_MISMATCH-1`: Missing Review Queue List Endpoint & Client Function
- **Severity**: **HIGH** (Blocks Milestone 4 `/dashboard/reviews`)
- **Upstream Contract**: Upstream implements and documents `GET /v1/review-queue` with `limit`, `offset`, and `state` parameters, returning `ReviewQueueListResponse` (ADR 003, commit `db9d309`).
- **Local State**:
  1. `src/lib/ai-assist/client.ts` has NO `listComplianceReviews()` function.
  2. `src/lib/ai-assist/types.ts` does NOT define `ReviewQueueSummary`, `ReviewQueueListResponse`, or `ListReviewsParams`.
  3. `src/app/api/compliance` has NO `reviews/route.ts` (only `reviews/[briefId]/route.ts`).
  4. `tests/api/compliance.test.ts` line 256 contains an explicit strict assertion that forbids any additional routes:
     ```ts
     expect(files).toEqual([
       "briefs/route.ts",
       "reviews/[briefId]/annotations/route.ts",
       "reviews/[briefId]/route.ts",
     ]);
     ```
- **Action Required for `ADAPTER_ENGINEER` & `TEST_ENGINEER`**:
  - Add `ReviewQueueSummary`, `ReviewQueueListResponse`, and `ListReviewsParams` to `src/lib/ai-assist/types.ts`.
  - Add `listComplianceReviews(params: ListReviewsParams): Promise<ReviewQueueListResponse>` to `src/lib/ai-assist/client.ts`.
  - Create `src/app/api/compliance/reviews/route.ts` supporting `GET` with query params (`limit`, `offset`, `state`).
  - Update `tests/api/compliance.test.ts` line 256 to include `"reviews/route.ts"`.

### `CONTRACT_MISMATCH-2`: HTTP 400 Mapped to 502 Bad Gateway
- **Severity**: **MEDIUM**
- **Upstream Contract**: Upstream emits `400 Bad Request` for client-level issues (e.g. invalid tenant format, body/header tenant mismatch, `Idempotency-Key` > 128 chars).
- **Local State**: In `src/lib/ai-assist/errors.ts`:
  ```ts
  export function mapUpstreamStatus(status: number): { status: number; code: AiAssistErrorCode } {
    if (status === 401 || status === 403) return { status: 502, code: "UPSTREAM_AUTH" };
    if (status === 404) return { status: 404, code: "NOT_FOUND" };
    if (status === 409) return { status: 409, code: "CONFLICT" };
    if (status === 422) return { status: 422, code: "UNPROCESSABLE_ENTITY" };
    if (status === 429) return { status: 429, code: "RATE_LIMITED" };
    if (status >= 500) return { status: 502, code: "BAD_GATEWAY" };
    return { status: 502, code: "BAD_GATEWAY" };
  }
  ```
  When upstream returns `400`, `mapUpstreamStatus` falls through to line 43: `{ status: 502, code: "BAD_GATEWAY" }`.
- **Impact**: Any upstream 400 error is presented to the client as a server failure (`502 Bad Gateway`) rather than a client error (`400 Bad Request`).
- **Action Required for `ADAPTER_ENGINEER`**: Add `if (status === 400) return { status: 400, code: "INVALID_BODY" };` (or a dedicated code like `"BAD_REQUEST"`) in `mapUpstreamStatus()`.

### `CONTRACT_MISMATCH-3`: Upstream Error `detail` Discarded
- **Severity**: **LOW / ARCHITECTURAL**
- **Upstream Contract**: Upstream returns `{"detail": "Human-readable explanation of failure"}` for all errors.
- **Local State**: `aiAssistFetch` in `client.ts` ignores the response body on `!response.ok` and synthesizes error messages from `SAFE_MESSAGES[mapped.code]`.
- **Impact**: This prevents leaking sensitive service details to the browser (security defense in depth), but loses specific failure reasons (e.g., distinguishing between invalid tenant format and idempotency length overflow).
- **Action Required**: Acceptable by design for browser isolation, but error logging should capture upstream `detail` server-side where safe (omitting any bearer tokens).

### `CONTRACT_MISMATCH-4`: Imprecise TypeScript Types in Adapter
- **Severity**: **LOW**
- **Upstream Contract**:
  - `BriefResponse.brief_id` is nullable (`str | None`) because blocked briefs may not produce a `brief_id`.
  - `ReviewQueueResponse.queue_state` is strictly `"pending_review" | "annotated"`.
  - `ReviewQueueResponse.annotations` is `Array<{ annotation_id: string; operator_id: string; annotation: string; created_at: string }>`.
  - `AnnotationRequest.annotation` is `string` (min 1, max 2000).
- **Local State**:
  - In `src/lib/ai-assist/types.ts`: `brief_id: string;` (non-nullable), `output: unknown; queue_state: unknown; annotations: unknown;`.
  - In `AddAnnotationParams`: `annotation: unknown`.
- **Action Required for `ADAPTER_ENGINEER`**: Tighten types in `src/lib/ai-assist/types.ts` to mirror upstream schemas accurately.

### `CONTRACT_MISMATCH-5`: Route Response Envelope Structure
- **Severity**: **INFORMATIONAL**
- **Upstream Contract**: Upstream returns raw JSON objects (`{"brief_id": "...", ...}`).
- **Local Next.js Routes**: Routes wrap upstream objects in `successResponse({ success: true, data })`.
- **Impact**: Frontend components (`/dashboard/reviews`, `/dashboard/reviews/[briefId]`) must expect `{ success: true, data: ReviewQueueResponse }` or `{ success: true, data: ReviewQueueListResponse }`.
- **Action Required for `FRONTEND_REVIEW_ENGINEER`**: Consume `.data` envelope property when calling Next.js API routes.

---

## 6. Logic Chain

1. **Upstream Source Identification**:
   - We inspected Git history for PR #2 merge commit `e4385628c9fffcacc904d7b963a594aa206015bf` referenced in `ORIGINAL_REQUEST.md`.
   - The commit belongs to the sibling repository `/home/moronto/Documents/Codex/2026-09-14/re/work/ai-assist` (`origin/main`).
   - Running `git show e4385628c9fffcacc904d7b963a594aa206015bf` verified the exact 44 files changed, including `docs/engineering/API_CONTRACT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and `shadowspark_api/*`.
2. **Semantics Extraction**:
   - Reading `shadowspark_api/auth.py` established the exact rules: `hmac.compare_digest` with `SHADOWSPARK_API_TOKEN`, fail-closed tenant validation in production returning 401, test default `"tenant_a"`, key fingerprinting `token:<sha256[:12]>`.
   - Reading `shadowspark_api/app.py` established the exact endpoints: `/healthz`, `/v1/compliance-review-brief`, `/v1/review-queue`, `/v1/review-queue/{brief_id}`, and `/v1/review-queue/{brief_id}/annotations`.
   - Reading `shadowspark_api/database.py` verified the SQLite schema, WAL mode, transaction isolation (`BEGIN IMMEDIATE`), unique composite indexes, deterministic JSON canonical hashing, and `sor_status_unchanged=1` invariant.
3. **Adapter Comparison**:
   - Reading `src/lib/ai-assist/*` in `shadowspark-production` revealed that the client implements brief creation, single-review inspection, and annotation, but completely lacks `listComplianceReviews`.
   - Reading `src/app/api/compliance/*` confirmed no endpoint exists to list review queue entries.
   - Inspecting `tests/api/compliance.test.ts` lines 251-262 verified that the current test suite actively asserts only 3 files exist in `src/app/api/compliance`, meaning the list route was omitted during initial adapter scaffolding.
   - Comparing status mappings in `src/lib/ai-assist/errors.ts` revealed that upstream HTTP 400 is inappropriately mapped to 502 Bad Gateway.
4. **Impact Assessment**:
   - Milestone 4 requires building `/dashboard/reviews` (the review queue list page). Without `GET /v1/review-queue` in the adapter and a corresponding Next.js route, the frontend cannot render the queue.
   - Thus, resolving `CONTRACT_MISMATCH-1` is a mandatory prerequisite for Milestone 4.

---

## 7. Caveats
- **Live Render Connectivity**: The live Render URL `https://shadowspark-ai-api.onrender.com` was verified in commit `38a1782` and `scripts/render_e2e.sh`. However, this audit operated in read-only offline/local inspection mode and did not make live external network requests to Render to avoid token/network side effects. The local test fixtures and upstream code are 100% byte-for-byte identical to the deployed commit `e438562`.
- **Database Concurrency**: The upstream service is designed for single-worker SQLite (`--workers 1`). If `shadowspark-production` issues high concurrency to AI-ASSIST, requests will queue on SQLite `PRAGMA busy_timeout=5000`.

---

## 8. Conclusion
1. **Contract Integrity**: The frozen AI-ASSIST v1.1.0 contract is authoritative, well-documented, and fully verified in commit `e4385628c9fffcacc904d7b963a594aa206015bf` at `/home/moronto/Documents/Codex/2026-09-14/re/work/ai-assist`.
2. **Key Findings**:
   - The authentication, tenant isolation (`X-Tenant-ID`/`X-Tenant-Slug`), and idempotency mechanisms in `src/lib/ai-assist/auth.ts` are sound and respect zero-trust tenant boundaries.
   - **`CONTRACT_MISMATCH-1`**: The review queue listing endpoint (`GET /v1/review-queue`) is missing from `src/lib/ai-assist/client.ts` and `src/app/api/compliance`, and must be added to support Milestone 4 (`/dashboard/reviews`).
   - **`CONTRACT_MISMATCH-2`**: Upstream HTTP 400 is mapped to HTTP 502 in `errors.ts` and should be mapped to HTTP 400.
   - **`CONTRACT_MISMATCH-4`**: TypeScript types in `src/lib/ai-assist/types.ts` should be sharpened.
3. **Action Plan for Downstream Agents**:
   - **`ADAPTER_ENGINEER`**: Add `listComplianceReviews`, create `/api/compliance/reviews/route.ts`, fix HTTP 400 mapping in `errors.ts`, sharpen types.
   - **`TEST_ENGINEER`**: Update `tests/api/compliance.test.ts` file inventory test and add tests for review queue listing.
   - **`FRONTEND_REVIEW_ENGINEER`**: Build `/dashboard/reviews` and `/dashboard/reviews/[briefId]` consuming the wrapped API routes.

---

## 9. Verification Method

To independently verify this specification audit:

1. **Verify Upstream Contract and Git State**:
   ```bash
   cd /home/moronto/Documents/Codex/2026-09-14/re/work/ai-assist
   git log -n 5 --oneline origin/main
   git show e4385628c9fffcacc904d7b963a594aa206015bf:docs/engineering/API_CONTRACT.md
   git show e4385628c9fffcacc904d7b963a594aa206015bf:shadowspark_api/schemas.py
   git show e4385628c9fffcacc904d7b963a594aa206015bf:shadowspark_api/app.py
   ```
2. **Run Local Adapter Tests in `shadowspark-production`**:
   ```bash
   cd /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production
   npm run test -- tests/ai-assist-client.test.ts tests/api/compliance.test.ts
   ```
   *Expected*: All 35 tests pass.
3. **Verify File Inventory Restriction in `tests/api/compliance.test.ts`**:
   Inspect line 256 of `tests/api/compliance.test.ts` to see that `reviews/route.ts` is currently excluded from the expected file list.
4. **Verify Absence of List Function in `src/lib/ai-assist/client.ts`**:
   Inspect `src/lib/ai-assist/client.ts` to confirm only `createComplianceBrief`, `getComplianceReview`, and `addComplianceAnnotation` are exported.

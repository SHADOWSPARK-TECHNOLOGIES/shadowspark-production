# DISPATCH — Worker Red-Team (Milestone M-R3)

## Mission
Implement Milestone M-R3: SEC Circular 26-1 Red-Team Compliance & Security Stress-Testing Suite.

## Inputs & Context
- Authoritative User Request: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (§ 2026-09-17T15:24:03Z)
- Master Scope: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/orchestrator_3/SCOPE.md`
- Spec Mining Report & Handoff: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_sec_1/handoff.md`
- Working Directory: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_redteam_1`
- Parent Conversation ID: `8e5affe9-18de-49ab-bcf9-1a25d2ef4b21`

## Bounded Write Ownership
You are STRICTLY CONFINED to writing and modifying ONLY these files:
- `tests/security/red-team-compliance.test.ts` (create)
- Metadata files inside your working directory (`.agents/teamwork_preview_worker_redteam_1/`)

DO NOT touch any file outside this bounded domain.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
Implement the comprehensive automated red-team compliance test suite in `tests/security/red-team-compliance.test.ts`:
1. **Scenario A: Adversarial Prompt Injection in Transaction Notes (OWASP LLM01:2026)**:
   - Injected adversarial payloads into transaction narrative, loan purpose, and compliance exception notes (direct instruction hijacking, delimiter escapes, JSON injection).
   - Assert that advisory engine flags the input (`LLM01:2026` / `PROMPT_INJECTION_FLAGGED`).
   - Assert crucial invariant: `sor_status_unchanged === true`.
   - Assert underlying database status remains unapproved (`PENDING_REVIEW` or `SUBMITTED`).
   - Assert audit log emitted documenting flagged input without executing injected instructions.
2. **Scenario B: Cross-Tenant Data Leakage & Multi-Tenant Replay**:
   - Assert zero data leakage across isolated tenant partitions.
   - Replay Tenant Alpha's `Idempotency-Key` from Tenant Beta; verify Tenant Beta does not receive cached responses or Tenant Alpha data.
   - Assert spoofed `X-Tenant-ID` header is ignored.
   - Assert mismatched `x-tenant-slug` returns HTTP 403 `TENANT_MISMATCH`.
3. **Scenario C: Unauthorized IDOR Brief & Record Retrieval**:
   - Probe Tenant Alpha's brief ID from Tenant Beta via `GET /api/compliance/reviews/[briefId]`.
   - Assert anti-enumeration: returns HTTP 404 `NOT_FOUND` ("Review not found"), indistinguishable from non-existent brief ID.
   - Assert cross-tenant mutation returns HTTP 404 and preserves resource integrity.
   - Assert unauthenticated calls fail closed with HTTP 401; unauthorized roles fail closed with HTTP 403.
4. **Scenario D: Audit Trail Immutability & Mathematical Non-Repudiation**:
   - Assert `AuditLog` and `KycVerificationHistory` are append-only.
   - Assert double-entry balance invariant ($\sum D = \sum C$ in BigInt kobo) rolls back on unbalanced entries.
   - Assert all financial reversals are written as compensating transactions (`POSTED → REVERSED`).
5. **Verification**:
   - Run `npx vitest run tests/security/red-team-compliance.test.ts`
   - Run `npm test`
   - Run `npm run test:secrets`
   - Run `npm run typecheck`
6. Write comprehensive `handoff.md` and send message to parent upon completion.

## 2026-09-17T15:33:18Z
You are Worker Red-Team for Milestone M-R3. Your working directory is:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_redteam_1
Your task is defined in:
/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_redteam_1/DISPATCH.md
Read ORIGINAL_REQUEST.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md (§ 2026-09-17T15:24:03Z).
Read your DISPATCH.md and the spec mining handoff at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_sec_1/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Respect your bounded write ownership strictly. Implement the automated red-team compliance test suite in tests/security/red-team-compliance.test.ts covering: prompt injection in transaction notes (LLM01:2026), multi-tenant replay & cross-tenant leakage defense, unauthorized IDOR brief retrieval, and audit trail immutability / double-entry invariants. Run verification commands and write your handoff.md, then send a message back.

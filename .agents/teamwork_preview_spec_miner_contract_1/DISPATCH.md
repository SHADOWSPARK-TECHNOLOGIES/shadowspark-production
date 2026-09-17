# DISPATCH — AI_ASSIST_CONTRACT_AUDITOR (Contract 1)

## Identity
- Role: AI_ASSIST_CONTRACT_AUDITOR
- Type: teamwork_preview_spec_miner
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1
- Parent Orchestrator: orchestrator_1

## Objective
Execute Milestone 2 (R2) specification audit of the AI-ASSIST v1.1.0 contract:
1. Locate and read the actual upstream contract specification for AI-ASSIST v1.1.0 in the repository, docs, contracts, schemas, or git history (PR #2 merge commit `e4385628c9fffcacc904d7b963a594aa206015bf`).
2. Verify all specified semantics:
   - Authentication (service tokens, headers, credential formats)
   - Tenant semantics (`X-Tenant-ID`, `X-Tenant-Slug` if applicable, header casing, multi-tenant boundaries)
   - Idempotency headers/keys and retry semantics
   - Review queue endpoints, brief creation, brief retrieval, annotation
   - Pagination, filtering, sort parameters
   - Error response status codes and body schemas
   - Source-of-record behavior and advisory guarantees
3. Compare against existing local adapter implementations (`src/lib/ai-assist/*`, `/api/compliance/*`) and any test fixtures.
4. If live or local behavior differs materially from frozen upstream contract, document exactly and flag any `CONTRACT_MISMATCH`.
5. Produce complete API specification inventory (endpoints, methods, request schemas, response schemas, error schemas).

## Scope Boundaries
- DO NOT modify any repository files.
- READ-ONLY investigation and specification extraction.

## Inputs
- ORIGINAL_REQUEST.md: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (MANDATORY: read this first).
- Repository Root: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production`

## Output Requirements
Write full specification report to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/handoff.md`.
Write progress updates to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/progress.md`.
Send a completion message back to orchestrator_1 when finished.

## 2026-09-16T13:46:49Z
You are AI_ASSIST_CONTRACT_AUDITOR (contract_1).
Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1
Read instructions in: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/DISPATCH.md
MANDATORY: Read /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md before starting work.

Your task:
1. Locate and read the actual upstream contract specification for AI-ASSIST v1.1.0 in the repository, docs, contracts, schemas, or git history (PR #2 merge commit e4385628c9fffcacc904d7b963a594aa206015bf).
2. Verify all specified semantics:
   - Authentication (service tokens, headers, credential formats)
   - Tenant semantics (X-Tenant-ID, X-Tenant-Slug if applicable, header casing, multi-tenant boundaries)
   - Idempotency headers/keys and retry semantics
   - Review queue endpoints, brief creation, brief retrieval, annotation
   - Pagination, filtering, sort parameters
   - Error response status codes and body schemas
   - Source-of-record behavior and advisory guarantees
3. Compare against existing local adapter implementations (src/lib/ai-assist/*, /api/compliance/*) and any test fixtures.
4. If live or local behavior differs materially from frozen upstream contract, document exactly and flag any CONTRACT_MISMATCH.
5. Produce complete API specification inventory (endpoints, methods, request schemas, response schemas, error schemas).
6. Write your findings to /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_spec_miner_contract_1/handoff.md.
7. Send a message to orchestrator_1 when complete.

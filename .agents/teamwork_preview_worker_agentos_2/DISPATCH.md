# DISPATCH — AGENT_OS_ENGINEER (`teamwork_preview_worker_agentos_2`)

## Identity
- Role: AGENT_OS_ENGINEER (Replacement Gen 2)
- Type: teamwork_preview_worker
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_2
- Parent Orchestrator: orchestrator_1

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 6 (R6) and Milestone 7 (R7) — Shared Agent OS and Documentation:
1. **Durable Rules in `AGENTS.md`**:
   - Ensure repository root `AGENTS.md` contains durable rules only: evidence discipline, engineering method, repository safeguards, multi-tenancy rules, Money Decimal rules, idempotency rules.
2. **Create Persistent Agent Skills in `.agents/skills/*`**:
   - Create directory `.agents/skills/` with the 7 required skills using progressive disclosure:
     1. `.agents/skills/recover-state/SKILL.md`: Commands and procedure for inspecting git branch, commit, status, worktrees, ledger analysis.
     2. `.agents/skills/current-docs/SKILL.md`: Runtime engine and installed versions detection (Node 24, Next.js 16.3.4, React 19.2.4, NextAuth 5.0.0-beta.30, Prisma 7.7.0, Zod 4.3.6), official doc lookup procedure without hallucinating flags.
     3. `.agents/skills/tdd/SKILL.md`: Test-driven development discipline (write failing test first, run with Node 24, implement minimum code, verify pass, refactor).
     4. `.agents/skills/systematic-debug/SKILL.md`: 4-phase debugging (observe, formulate hypothesis, minimal reproduction, fix and verify).
     5. `.agents/skills/security-review/SKILL.md`: Review protocol for the 10 attack surfaces: tenant bypass, IDOR, service-token leakage, unsafe retries, PII leakage (11-digit IDs), auth confusion, CORS, injection, generic proxy misuse, unsafe defaults.
     6. `.agents/skills/release-gate/SKILL.md`: Independent victory audit criteria, clean git status, full test pass, typecheck, lint, build, live verification.
     7. `.agents/skills/checkpoint-handoff/SKILL.md`: Format and protocol for compact handoffs and ledger updates.
3. Keep skills focused, progressive, and durable (no temporary facts — those belong in `CURRENT_STATE.md`).

## Exclusive Write Ownership
You own and may modify ONLY:
- `AGENTS.md`
- `.agents/skills/*`
DO NOT touch any source code in `src/` or `tests/`.

## Inputs
- MANDATORY: Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (R6 and R7 requirements).
- Read `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md`.

## Output Requirements
Write progress to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_2/progress.md`.
Write full handoff report to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_2/handoff.md`.
Send completion message to orchestrator_1 when finished.

## 2026-09-16T16:15:15Z
You are AGENT_OS_ENGINEER (worker_agentos_2).
Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_2
Read instructions in: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_2/DISPATCH.md
MANDATORY: Read /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md before starting work.
Read PROJECT.md at /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Review and refine `AGENTS.md` at repository root to ensure all durable repository rules are clearly specified (evidence discipline, engineering method, repository safeguards, multi-tenancy, Money Decimal with Prisma, idempotency, no merging PRs without user authorization).
2. Create directory `.agents/skills/` and implement the 7 required persistent Agent Skills using progressive disclosure:
   - `recover-state/SKILL.md`
   - `current-docs/SKILL.md`
   - `tdd/SKILL.md`
   - `systematic-debug/SKILL.md`
   - `security-review/SKILL.md`
   - `release-gate/SKILL.md`
   - `checkpoint-handoff/SKILL.md`
3. Document installed versions in `current-docs/SKILL.md` (Node 24, Next.js 16.3.4, React 19.2.4, NextAuth 5.0.0-beta.30, Prisma 7.7.0, Zod 4.3.6).
4. Write progress to `.agents/teamwork_preview_worker_agentos_2/progress.md` and handoff report to `.agents/teamwork_preview_worker_agentos_2/handoff.md`. Send a message when complete.

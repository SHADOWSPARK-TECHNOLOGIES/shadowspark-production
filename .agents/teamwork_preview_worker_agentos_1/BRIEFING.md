# BRIEFING — 2026-09-16T14:03:00Z

## Mission
Establish the persistent Agent OS layer by refining root AGENTS.md with durable rules and implementing the 7 core progressive-disclosure Agent Skills in .agents/skills/*.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist (AGENT_OS_ENGINEER)
- Working directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_1
- Original parent: e1df41dd-f8ac-4c2f-8937-0ec8a3377e8a (orchestrator_1)
- Milestone: M-AgentOS (Milestones 6 and 7 in ORIGINAL_REQUEST.md: Features 17, 18, 19)

## 🔒 Key Constraints
- DO NOT CHEAT. No hardcoding, facade implementations, or circumventing tasks.
- Bounded Write Ownership: Own and modify ONLY `AGENTS.md` and `.agents/skills/*` (plus workspace metadata in `.agents/teamwork_preview_worker_agentos_1/*`).
- DO NOT touch any source code in `src/` or `tests/`.
- Never modify `.github/copilot-instructions.md`.
- Never commit secrets, credentials, or production data.
- Skills must use progressive disclosure, remain focused, durable, and contain no temporary facts (temporary facts belong in `CURRENT_STATE.md`).
- Document exact installed versions in `current-docs/SKILL.md` (Node 24, Next.js 16.3.4, React 19.2.4, NextAuth 5.0.0-beta.30, Prisma 7.7.0, Zod 4.3.6).

## Current Parent
- Conversation ID: e1df41dd-f8ac-4c2f-8937-0ec8a3377e8a
- Updated: 2026-09-16T14:03:00Z

## Task Summary
- **What to build**:
  1. Review and refine root `AGENTS.md` to ensure all durable repository rules are clearly specified (evidence discipline, engineering method, repository safeguards, multi-tenancy rules, Money Decimal with Prisma, idempotency, no merging PRs without user authorization).
  2. Create directory `.agents/skills/` and implement the 7 required persistent Agent Skills using progressive disclosure:
     - `recover-state/SKILL.md`
     - `current-docs/SKILL.md`
     - `tdd/SKILL.md`
     - `systematic-debug/SKILL.md`
     - `security-review/SKILL.md`
     - `release-gate/SKILL.md`
     - `checkpoint-handoff/SKILL.md`
  3. Document installed versions in `current-docs/SKILL.md`.
- **Success criteria**:
  - `AGENTS.md` contains comprehensive, unambiguous durable rules matching all requirements.
  - All 7 skills created under `.agents/skills/<skill>/SKILL.md` with progressive disclosure (quick overview, core rules, detailed protocols/procedures, reference examples/pitfalls).
  - Version documentation in `current-docs/SKILL.md` is exact.
  - No temporary facts in skills.
  - No touch of `src/` or `tests/`.
- **Interface contracts**: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md
- **Code layout**: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/PROJECT.md § Code Layout & Bounded Write Ownership

## Key Decisions Made
- Progressive disclosure pattern for skills: Structured into Overview, Quick Reference Checklist, Detailed Procedures, Common Pitfalls / Anti-patterns, and Self-Verification.
- AGENTS.md should focus exclusively on durable rules and repository guardrails without transient state or project-specific task trackers.

## Artifact Index
- `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/AGENTS.md` — Root repository agent instructions & durable rules
- `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/skills/` — Directory containing 7 persistent skills
- `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_1/progress.md` — Worker progress heartbeat
- `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_worker_agentos_1/handoff.md` — Handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested this turn
- **Pending issues**: Implement AGENTS.md refinements and 7 skills

## Quality Status
- **Build/test result**: Pending verification
- **Lint status**: N/A for markdown docs, but formatting and structure will be rigorously validated
- **Tests added/modified**: N/A (read-only on src/ and tests/)

## Loaded Skills
- None specified by orchestrator

# DISPATCH — REPO_EXPLORER (Survey 1)

## Identity
- Role: REPO_EXPLORER & State Recovery
- Type: teamwork_preview_explorer
- Working Directory: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_survey_1
- Parent Orchestrator: orchestrator_1

## Objective
Execute Milestone 0 (R0) and initial repository survey:
1. Run and record Git state:
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git status --short --branch`
   - `git remote -v`
   - `git worktree list`
   - `git log --oneline --decorate -20`
2. Read and analyze existing documentation and state files:
   - `AGENTS.md`
   - `docs/engineering/CURRENT_STATE.md`
   - `docs/engineering/CODEX_LEDGER.md`
   - `docs/engineering/HANDOFF.md`
   - `docs/engineering/DECISIONS.md`
   - `.agents/skills/*`
   - `.codex/*`
3. Classify every modified or untracked file. Verify that NO Codex work is destroyed or overwritten.
4. Survey repository structure, package.json dependencies/scripts, installed versions, build/test setups, and overall codebase layout.

## Scope Boundaries
- DO NOT modify, delete, or reset any repository files.
- DO NOT run git reset, clean, checkout -- ., or stash drop.
- READ-ONLY investigation.

## Inputs
- ORIGINAL_REQUEST.md: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/ORIGINAL_REQUEST.md` (MANDATORY: read this first).
- Repository Root: `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production`

## Output Requirements
Write a detailed report to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_survey_1/handoff.md`.
Write progress updates to `/home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/teamwork_preview_explorer_survey_1/progress.md`.
Send a completion message back to orchestrator_1 when finished.

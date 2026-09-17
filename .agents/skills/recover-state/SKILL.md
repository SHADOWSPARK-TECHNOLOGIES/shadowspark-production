---
name: recover-state
description: Recover git repository state, classify modified and untracked files, and reconcile engineering ledgers without destructive operations.
version: 1.0.0
tags:
  - git
  - state-recovery
  - ledgers
  - audit
---

# Recover State Skill

## 1. Overview & Quick Reference

This skill governs the non-destructive discovery, snapshotting, and reconciliation of repository state. Whenever an agent or engineer enters a workspace, resumes work, or transitions between tasks, they must execute this protocol before making any changes.

### Immediate Action Checklist
- [ ] Run the 6 mandatory git inspection commands.
- [ ] Check active branch, HEAD commit SHA, and remote tracking status.
- [ ] Inspect existing engineering documentation (`docs/engineering/*`, `AGENTS.md`, `.agents/*`).
- [ ] Classify every modified and untracked file into an explicit status matrix.
- [ ] Check for in-flight git worktrees or stashes.
- [ ] Reconcile observed filesystem state against documented project milestones.
- [ ] **NEVER** run destructive git commands (`git reset --hard`, `git clean -fd`, `git checkout -- .`).

---

## 2. Core Non-Negotiables & Invariants

1. **Absolute Non-Destruction**:
   - Never execute `git reset --hard`, `git clean -fd`, `git clean -fx`, or `git checkout -- .`.
   - Never overwrite or discard unknown work from previous engineers or agents (e.g. Codex, automated pipelines).
   - If an untracked file appears to be obsolete or a backup (e.g. `.bak`), record it in the ledger and verify before taking any cleanup action.

2. **Evidence-Based Reconstruction**:
   - Base all claims on observed command output, not on memory or stale documentation.
   - If documentation claims a milestone is complete, verify the filesystem and git log before accepting the claim.

3. **Classification Completeness**:
   - Every file reported by `git status --short` must be accounted for in the state classification matrix. No untracked or modified file may be left unexplained.

---

## 3. Step-by-Step Operating Procedure

### Step 1: Execute Git Snapshot Commands
Execute the 6 baseline inspection commands verbatim:

```bash
# 1. Active branch name
git branch --show-current

# 2. Exact HEAD commit hash
git rev-parse HEAD

# 3. Short status with branch tracking info
git status --short --branch

# 4. Remote URLs and fetch/push targets
git remote -v

# 5. Linked worktrees (ensure no isolated worktrees hold uncommitted state)
git worktree list

# 6. Recent commit history with decorations
git log --oneline --decorate -20
```

Also check for any existing git stashes:
```bash
git stash list
```

### Step 2: Inspect Engineering Context and Ledgers
Read and cross-reference documentation files if present:
- `AGENTS.md` (root durable repository rules)
- `docs/engineering/CURRENT_STATE.md` (active features, blockers, in-flight work)
- `docs/engineering/CODEX_LEDGER.md` or `ANTIGRAVITY_LEDGER.md` (chronological record of engineering changes)
- `docs/engineering/HANDOFF.md` (previous shift notes and transition details)
- `docs/engineering/DECISIONS.md` (architectural decisions and trade-offs)
- `.agents/PROJECT.md` (milestone roadmap and bounded write domains)
- `.codex/*` (any historical prompts or session metadata)

### Step 3: Classify Working Tree Changes
For each file listed in `git status --short`, determine its origin and classification:

1. **Modified Files (`M`)**:
   - Run `git diff <path>` to inspect exact uncommitted changes.
   - Determine whether the change belongs to a current feature, a defect fix, or an unfinished experiment.

2. **Staged Files (`A`, `M`, `D`)**:
   - Run `git diff --cached <path>` to inspect staged changes.

3. **Untracked Files (`??`)**:
   - Inspect file contents (`view_file` or `cat`).
   - Categorize into one of:
     - `IN_PROGRESS_SOURCE`: Source code under active implementation.
     - `IN_PROGRESS_TEST`: New unit, integration, or E2E tests.
     - `AGENT_METADATA`: Agent workspace coordination (e.g. `.agents/teamwork_preview_worker_*`).
     - `ENGINEERING_DOC`: Documentation or ledger updates.
     - `ORPHAN_BACKUP`: Leftover editor backups or temporary copies (e.g. `*.bak`, `*.tmp`).
     - `BUILD_ARTIFACT`: Generated files that should be gitignored.

### Step 4: Construct State Classification Matrix
Record the findings in a structured table:

| File Path | Git Status | Classification | Originating Feature / Context | Recommended Action |
|-----------|------------|----------------|-------------------------------|--------------------|
| `src/lib/ai-assist/client.ts` | `??` | `IN_PROGRESS_SOURCE` | M-Adapter: AI-ASSIST typed client | Preserve & continue |
| `tests/api/compliance.test.ts` | `??` | `IN_PROGRESS_TEST` | M-Adapter: Route TDD suite | Preserve & continue |
| `docs/engineering/CURRENT_STATE.md` | `??` | `ENGINEERING_DOC` | Project state ledger | Maintain & update |

### Step 5: Ledger Reconciliation & Freshness Check
- Compare the latest commit in `git log -1` against the last recorded commit in `CURRENT_STATE.md` or `ANTIGRAVITY_LEDGER.md`.
- If the git commit is ahead of the ledger: summarize recent commits and append them to the ledger.
- If the ledger describes completed work that is missing from git: investigate whether work is present in untracked files or a separate branch/worktree.

---

## 4. Common Pitfalls & Anti-Patterns

- **The Clean Sweep Fallacy**: Running `git clean -fd` to "start clean" wipes out untracked files authored by prior workers. **Strictly prohibited.**
- **Assuming Untracked = Disposable**: Untracked files frequently contain newly implemented modules, tests, or documentation that have not yet been committed.
- **Stale Ledger Trust**: Believing a ledger entry stating "all tests pass" without re-running the test suite on the current checkout.
- **Detached HEAD Amnesia**: Not noticing that the repository is in a detached HEAD state, risking lost commits upon branch switching.

---

## 5. Verification & Completion Criteria

A state recovery is complete when:
1. All 6 git commands have been executed and their outputs documented.
2. Every untracked and modified file has been classified with zero ambiguities.
3. The HEAD commit SHA, branch name, and worktree status are recorded in the session briefing.
4. No files were discarded or destroyed during the recovery process.

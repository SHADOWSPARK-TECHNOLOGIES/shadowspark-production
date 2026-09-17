---
name: checkpoint-handoff
description: Checkpoint state preservation, engineering ledgers update protocol, and self-contained compact handoff authoring.
version: 1.0.0
tags:
  - handoff
  - ledgers
  - checkpoint
  - coordination
  - reporting
---

# Checkpoint & Handoff Skill

## 1. Overview & Quick Reference

As autonomous agents and software engineers collaborate across shifts and subtasks, state preservation and crystal-clear handoffs are critical to prevent loss of progress, conflicting edits, or hallucinated claims. This skill defines the mandatory protocol for maintaining engineering ledgers, authoring 5-component handoff reports, and generating the standardized compact handoff.

### The 3 Pillars of Handoff
```
┌─────────────────────────────────────────────────────────┐
│ 1. Persistent Ledgers (`docs/engineering/*`)            │
│    - CURRENT_STATE.md (active features & blockers)      │
│    - ANTIGRAVITY_LEDGER.md (chronological actions/SHAs) │
│    - HANDOFF.md (operational shift handoff)             │
├─────────────────────────────────────────────────────────┤
│ 2. 5-Component Report (`handoff.md`)                    │
│    - Observation, Logic Chain, Caveats, Conclusion,     │
│      Verification Method                                │
├─────────────────────────────────────────────────────────┤
│ 3. Compact Handoff (18-Key Standard Schema)             │
│    - Machine-readable summary for orchestrators/auditors│
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Non-Negotiables & Invariants

1. **Self-Contained Requirement**:
   - Every handoff report must be fully self-contained. The receiving engineer or agent must be able to continue immediately without asking clarification questions.
2. **Zero Fabrication**:
   - Never report tests as passing, commits as pushed, or features as verified unless observed directly via command outputs during the current session.
3. **Strict Metadata Discipline**:
   - The `.agents/` directory must contain ONLY coordination metadata (briefings, plans, progress logs, handoffs). Source code, tests, and configuration files must **NEVER** be placed in `.agents/`.
4. **Communication Separation (Files vs Messages)**:
   - **Files** for detailed content delivery (reports, ledgers, diffs).
   - **Messages** for concise coordination (notifications, status pings, blockers).

---

## 3. Step-by-Step Checkpoint Operating Procedure

### Step 1: Update Persistent Engineering Ledgers
Before concluding any shift or substantial milestone, update the persistent documents in `docs/engineering/`:

1. **`docs/engineering/CURRENT_STATE.md`**:
   - Update milestone statuses (DONE, IN_PROGRESS, BLOCKED).
   - Document newly added endpoints, components, or configuration changes.
   - List any unresolved risks or active blockers.
2. **`docs/engineering/ANTIGRAVITY_LEDGER.md`** (or `CODEX_LEDGER.md`):
   - Record chronological entries with UTC timestamps:
     ```markdown
     ### [YYYY-MM-DDTHH:MM:SSZ] <Agent / Engineer Role>
     - **Action**: <Description of work performed>
     - **Files Changed**: <List of modified paths>
     - **Verification**: <Commands executed and outcomes>
     - **Git Commit**: <SHA or working tree state>
     ```
3. **`docs/engineering/HANDOFF.md`**:
   - Summarize the exact handoff state, immediate next steps, and warnings for incoming engineers.

### Step 2: Author the 5-Component Handoff Report (`handoff.md`)
In your agent workspace folder (e.g. `.agents/<agent_folder>/handoff.md`), structure the report into these 5 mandatory sections:

1. **Observation**:
   - What was directly observed: exact file paths, line numbers, terminal commands, verbatim error messages, and tool results.
2. **Logic Chain**:
   - Step-by-step deductive reasoning connecting the observations to the actions taken or conclusions reached.
3. **Caveats**:
   - Uninvestigated areas, operating assumptions, or known environment limitations. State "No caveats." if none exist.
4. **Conclusion**:
   - Final assessment, directly supported by the logic chain, actionable, and scoped.
5. **Verification Method**:
   - Specific commands and reproduction instructions allowing an independent engineer to verify the claims.

### Step 3: Format the Standard 18-Key Compact Handoff
When reporting to the primary orchestrator or user, output the standardized compact handoff block:

```
PROJECT: shadowspark-production
BRANCH: <current git branch>
HEAD: <exact git commit SHA>
UPSTREAM CONTRACT: <verified contract version or commit>
COMPLETED: <comma-separated list of completed features/tasks>
VERIFIED: <comma-separated list of verified behaviors>
TESTS: <test counts, e.g. "XX passed, 0 failed across Y suites">
SECURITY: <security status, e.g. "10 attack surfaces checked, secret test clean">
COMMITS: <list of commit SHAs authored, or "working tree uncommitted">
PR: <PR URL/number or "N/A">
CI: <CI status or "N/A">
DEPLOYMENT: <deployment URL or READY_TO_DEPLOY with reason>
LIVE VERIFICATION: <health check status or "pending deployment">
CUSTOMER IMPACT: <summary of customer experience improvements>
REVENUE IMPACT: <summary of business/financial safeguards>
BLOCKERS: <"none" or specific external blocker description>
NEXT EXACT ACTION: <precise next command or task to execute>
DO NOT DO: <explicit prohibitions or warnings for incoming workers>
```

### Step 4: Subagent Messaging Protocol
When sending status updates between agents or to the orchestrator via `send_message`, format messages cleanly:

```
**Context**: [What task or milestone you are working on]
**Content**: [Concise summary of findings or completion status; reference file paths for details]
**Action**: [What you expect the recipient to do next]
```

---

## 4. Common Pitfalls & Anti-Patterns

- **The "Everything Passed" Trap**: Reporting that tests passed without providing the specific command line, number of tests executed, or duration.
- **Dangling Next Steps**: Concluding a report with "needs further work" without specifying the exact file, function, or command to run next.
- **Scattering Code in `.agents/`**: Authoring scratch helper scripts or test files inside `.agents/` instead of `scripts/` or `tests/`.
- **Duplicate Conflicting Ledgers**: Modifying `CURRENT_STATE.md` without cross-checking `PROJECT.md` or git history.

---

## 5. Self-Verification Checklist

Before submitting a handoff report:
- [ ] Updated `CURRENT_STATE.md` and `ANTIGRAVITY_LEDGER.md` with accurate timestamps and commit hashes.
- [ ] Authored `handoff.md` with all 5 mandatory sections fully populated.
- [ ] Validated that all 18 keys in the compact handoff are filled without placeholders.
- [ ] Confirmed no source code, tests, or data files were written into `.agents/`.
- [ ] Verified that all claims in the report can be reproduced using the documented verification commands.

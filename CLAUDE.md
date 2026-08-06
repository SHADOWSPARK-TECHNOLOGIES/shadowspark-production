# CLAUDE.md — ShadowSpark Monorepo
# Protocol: Mission Control + Context Ledger + Surgical Executor (merged)
# Keep this file under 200 lines. Do not expand without justification.

## Project Identity
- Monorepo: ShadowSpark Technologies
- Apps: apps/lodgist (Nigeria-first proptech/trust platform) | apps/shadowspark-site (corporate site)
- Stack: Next.js 14+ App Router · TypeScript · Tailwind CSS · Prisma · Neon (PostgreSQL) · Vercel
- Auth: (your auth provider — update this)
- Payments: Paystack / Flutterwave
- AI: Anthropic SDK
- Package manager: pnpm
- Test command: pnpm test
- Build command: pnpm build
- Typecheck: pnpm typecheck

## Brand Constants (never modify)
- Deep Navy: #0B1B2B
- Vibrant Orange: #FF6F3C
- Teal: #1ABC9C
- Mobile-first. Nigeria-specific UX. Trust-first messaging.

## Folder Map
apps/
  lodgist/
    src/
      app/          # Next.js App Router pages
      api/          # API route handlers
      components/   # UI components
      lib/          # Shared utilities, Prisma client
      generated/    # DO NOT EDIT — auto-generated files
  shadowspark-site/
    src/
      app/
      components/
prisma/             # Schema + migrations (shared)
packages/           # Shared packages across apps

## Execution Protocol

### Pre-Execution (mandatory for any multi-file task)
Before touching files, emit:
  TASK: [goal]
  SUBTASKS:
    1. [action] → DONE: [condition]
    2. [action] → DONE: [condition]
  FILES: [list only files you will touch]
User continuing = implicit approval. Then execute silently.

### During Execution
- No narration. No preamble. No postamble.
- Output only: diffs, commands, or status lines.
- On subtask done: "✓ [N]: [one-line result]"
- On all done: "MISSION COMPLETE: [one-line summary]"

### Blockers
- "BLOCKED [N]: [reason] | OPTIONS: [A] / [B]" — then halt.
- Never proceed on assumptions.

## Clarification Rules
- Zero mid-task questions if inferable from context or this file.
- Ambiguous at start: "AMBIGUOUS: [what is unclear]" — one line, then pause.
- Never ask the user to repeat what was already stated this session.

## File Access Rules
- Read ONLY files listed in pre-execution manifest.
- Use targeted reads: grep, sed, line ranges — never full file loads.
- Delegate all codebase exploration to subagents (3-line summary back to main context).
- Log unplanned reads: "UNPLANNED READ: [file] — [reason]"
- NEVER edit files in: src/generated/ | .env* | prisma/migrations/

## Code Conventions
- TypeScript strict mode. No any without justification.
- Async/await only (no .then chains).
- Absolute imports via @/...
- Validate all API inputs. Use standard error response shape.
- Add auth failure tests for all protected routes.
- Tailwind only for styling — no inline style unless dynamic value.

## Context Efficiency Rules
- Never re-read files already read this session without new justification.
- Never surface raw file dumps into main context.
- Never explain architecture the user already described.
- Never offer unsolicited alternatives ("you could also...").
- Never summarize completed work beyond the one-line status.

## Forbidden (always)
- Preamble: "Sure!", "Great!", "I'll now...", "Of course!"
- Postamble: "Let me know if you need changes!"
- Repeating the task back before executing.
- Unsolicited refactors or "improvements".
- Opening files for context that aren't needed for the task.
- Any response longer than the output artifact warrants.

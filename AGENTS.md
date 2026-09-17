# Repository Agent Instructions

Act as a senior software engineer. Prefer correctness, maintainability, security, and clear reasoning over complexity.

## Evidence discipline

- Never invent files, functions, APIs, commands, test results, or completed actions.
- Inspect relevant repository files before making claims or changes.
- Distinguish observed facts, reasoned inferences, assumptions, and unknowns.
- Do not claim a test, build, deployment, or command succeeded unless its output was directly observed in the current session.
- Verify claims from other agents or historical documentation against current repository state before acting on them.

## Engineering method

1. **Understand requirements and constraints**: Review task specifications, architecture decisions, and repository rules before planning changes.
2. **Inspect state before acting**: Check git status, branch, working tree, existing tests, and configuration before modifying files.
3. **Respect bounded write domains**: Modify only files within your assigned write boundary. Never touch files owned by other agents or unrelated domains.
4. **Make minimal, technically sound changes**: Follow the minimal-change principle. Do not perform opportunistic "while I'm here" refactoring or unsolicited stylistic rewrites.
5. **Test-driven discipline**: Add or update focused tests for changed behavior. Follow TDD (red-green-refactor) whenever feasible.
6. **Verify thoroughly**: Run relevant unit/integration tests, type checks (`npm run typecheck`), linting (`npm run lint`), and build (`npm run build`). Never self-certify without running the actual commands.
7. **Review diffs**: Inspect `git diff` for unintended edits, regressions, dead code, or accidental credential leaks.
8. **Report transparently**: Report exact changes made, commands executed with verbatim outcomes, and any remaining risks or unknowns.

## Repository safeguards

- **Protected instructions**: Never modify `.github/copilot-instructions.md`.
- **Secret hygiene**: Do not commit secrets, credentials, API keys, tokens, generated environment files (`.env`, `.env.local`), or production data. Always run credential leak tests (`npm run test:secrets`) before declaring completion.
- **Multi-tenant isolation**:
  - Preserve strict tenant isolation across all authenticated APIs, background jobs, and database queries.
  - Derive tenant identity exclusively from verified server-side authentication context (e.g. NextAuth session or verified token paired with authoritative `TenantMembership` database lookup).
  - NEVER trust or accept tenant identity (`tenantId`, `tenantSlug`) from client-supplied request bodies, URL query parameters, or untrusted headers.
  - Fail closed: If authentication or tenant membership cannot be verified, return 401 Unauthorized or 403 Forbidden immediately.
- **Monetary precision with Prisma `Decimal`**:
  - Keep money values exact using Prisma `Decimal` (and arbitrary-precision decimal representations).
  - Do NOT use JavaScript IEEE-754 floating-point arithmetic (`number`) for persisted monetary amounts, ledger balances, or financial calculations.
- **Idempotency**:
  - Require idempotency for mutating public and external API operations where retries could duplicate work or financial side-effects.
  - Validate and enforce idempotency using unique `Idempotency-Key` headers and database-backed idempotency tracking.
- **Pull request authorization**:
  - Do NOT merge pull requests unless the user explicitly authorizes it.
- **Synchronized contracts**:
  - Keep API validation schemas (Zod), error responses, database schemas (Prisma), audit records, and documentation synchronized with implementation.
- **Fail-closed security**:
  - In authentication, authorization, RBAC, and tenant resolution, default to deny / fail closed if validation fails or context is ambiguous.

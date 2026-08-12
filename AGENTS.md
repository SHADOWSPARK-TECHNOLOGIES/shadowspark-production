# Repository Agent Instructions

Act as a senior software engineer. Prefer correctness, maintainability, security, and clear reasoning over complexity.

## Evidence discipline

- Never invent files, functions, APIs, commands, test results, or completed actions.
- Inspect relevant repository files before making claims or changes.
- Distinguish observed facts, reasoned inferences, assumptions, and unknowns.
- Do not claim a test, build, deployment, or command succeeded unless its output was observed.

## Engineering method

1. Understand the requested outcome and constraints.
2. Inspect repository instructions, source, configuration, and Git state.
3. Make the smallest technically sound change without disturbing unrelated work.
4. Add or update focused tests for changed behavior.
5. Run the relevant tests, type checks, linting, and build.
6. Review the final diff for regressions and security issues.
7. Report what changed, what was verified, and what remains uncertain.

## Repository safeguards

- Never modify `.github/copilot-instructions.md`.
- Do not commit secrets, credentials, generated environment files, or production data.
- Preserve tenant isolation on authenticated APIs and derive tenant identity from verified authentication context, never request input.
- Keep money values exact with Prisma `Decimal`; do not use JavaScript floating-point arithmetic for persisted monetary values.
- Require idempotency for mutating public API operations where retries could duplicate work.
- Keep API validation, error responses, audit records, and documentation synchronized with implementation.
- Do not merge pull requests unless the user explicitly authorizes it.

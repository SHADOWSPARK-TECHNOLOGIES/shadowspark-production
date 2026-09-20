# Security note (secret-scanning hygiene)

## Tree status (main tip)
- `PAYMENT_TESTING_GUIDE.md` — absent from tip (historical secret-scanning alert #18, type `resend_api_key` remains open until founder rotates and dismisses).
- `docs/reference-uploads/**` — absent from tip (historical alerts #2–#8, type `google_api_key` remain open until founder rotates and dismisses).
- Alert #1 (`anthropic_api_key`) is tied to a PR comment location and cannot be purged via file delete.

## Credential-leak CI
- Tracked agent handoff prose must not use `VERIFY_TOKEN` / `verifyToken` assignment-like forms with non-placeholder RHS.
- Prefer `process.env.WHATSAPP_VERIFY_TOKEN` (or `[redacted]`) when documenting webhook verification.

## Founder follow-up
- Rotate Resend / Google / Anthropic keys in provider consoles first.
- After rotation + tip tree clean, founder may dismiss open secret-scanning alerts.
- History rewrite (purge from git history) requires separate founder approval and is out of scope for tree-only purge PRs.
- Do not close alerts from automation in this PR.

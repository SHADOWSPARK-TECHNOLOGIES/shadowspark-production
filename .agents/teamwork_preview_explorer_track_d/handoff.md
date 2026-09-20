# Track D handoff (security-redacted excerpt for H-006)

Full original Track D report remains in git history on `main` (`1085ba2`). This tip copy keeps the credential-leak fix surface and drops bulk narrative to keep the purge PR reviewable.

## WhatsApp webhook verification (credential-leak fix)

#### Meta Cloud API WhatsApp Webhook (`src/app/api/webhooks/whatsapp/meta/route.ts`)
- **GET Verification Handler (lines 35–54)**:
  - Validates `WHATSAPP_VERIFY_TOKEN`.
  - If token is missing/empty: returns HTTP 503 `Webhook verification is not configured`.
  - If hub.mode is "subscribe" and the inbound verify token matches process.env.WHATSAPP_VERIFY_TOKEN, returns HTTP 200 echoing hub.challenge.
  - If token mismatch: returns HTTP 403 `Verification failed`.
  - Fails closed and redacts token comparisons.
- **POST Inbound Webhook Handler**: HMAC-SHA256 via `x-hub-signature-256`; requires `WHATSAPP_APP_SECRET` or `META_APP_SECRET`; fails closed.

## Tree purge status
- `PAYMENT_TESTING_GUIDE.md` — already absent from tip (alert #18 `resend_api_key` remains open until founder rotates/dismisses).
- `docs/reference-uploads/**` — already absent from tip (alerts #2–#8 `google_api_key` remain open until founder rotates/dismisses).
- Alert #1 `anthropic_api_key` is PR-comment located; cannot purge via file delete.

## Note
Do not close secret-scanning alerts from this PR. History rewrite requires separate founder approval.

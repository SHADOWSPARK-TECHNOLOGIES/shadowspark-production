#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==================================="
echo " ShadowSpark Backend Demo Script"
echo "==================================="
echo

echo "[1/3] Typecheck..."
pnpm typecheck

echo

echo "[2/3] Security hardening tests (pnpm test)..."
pnpm test

echo
echo "[3/3] Demo summary"
echo "------------------"
echo "Public health endpoint:        GET  /api/health"
echo "Auth (bcrypt + JWT):           POST /api/v1/auth/login"
echo "                               GET  /api/v1/auth/me"
echo "Loan lifecycle (state machine): GET  /api/v1/loans"
echo "                               POST /api/v1/loans  [Idempotency-Key]"
echo "                               PATCH /api/v1/loans/:id  [Idempotency-Key]"
echo "KYC pipeline:                  GET  /api/v1/kyc/pending"
echo "                               POST /api/v1/kyc/:id/verify  [Idempotency-Key]"
echo "                               POST /api/v1/kyc/:id/ocr"
echo "Messages (QUEUED → SENT):      GET  /api/v1/messages"
echo "                               POST /api/v1/messages/send  [Idempotency-Key]"
echo "Workflows:                     GET  /api/v1/workflows"
echo "                               POST /api/v1/workflows/:id/execute"
echo "API keys (server-side only):   POST /api/v1/api-keys  [Idempotency-Key]"
echo "Invitations:                   POST /api/v1/invitations  [Idempotency-Key]"
echo "Settings audit:                POST /api/v1/settings  [Idempotency-Key]"
echo
echo "Security invariants proven by tests:"
echo "  • JWT contains userId, tenantId, role and rejects tampering."
echo "  • Passwords are bcrypt hashed."
echo "  • Protected routes return 401 without a valid Bearer token."
echo "  • Cross-tenant resource access returns 404."
echo "  • Idempotency-Key is required (400) and replays cached responses."
echo "  • Loan status transitions are enforced by a state machine."
echo "  • KYC verification writes immutable history and auto-advances loans."
echo "  • Messages are stored as QUEUED before async delivery (Twilio or mock)."
echo "  • Workflow execution is reliable and writes audit logs."
echo "  • API keys, invitations, and settings changes are audit logged."
echo "  • Secrets (API keys, tokens) are never persisted in plaintext."
echo
echo "Run workers in separate terminals:"
echo "  pnpm worker:message"
echo "  pnpm worker:kyc-ocr"

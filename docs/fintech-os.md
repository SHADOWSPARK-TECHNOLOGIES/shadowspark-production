# ShadowSpark Fintech OS — Setup Guide

## Overview

The Fintech OS is a WhatsApp-based loan origination module integrated directly
into the ShadowSpark platform. It provides:

- **Loan Intake Bot** — stateful WhatsApp conversation collecting applicant
  details, BVN, and documents via Twilio.
- **KYC Verification** — BVN identity check via VerifyMe API (mock-able for dev).
- **Admin Dashboard** — `/dashboard/loans` for reviewing, approving, and messaging applicants.
- **Disbursement Notification** — webhook + WhatsApp message on loan approval.
- **Recovery Bot** — BullMQ-scheduled payment reminders with Nigeria quiet-hour awareness.

---

## Environment Variables

Add the following to your `.env` (see `.env.example` for all keys):

```env
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# KYC Provider
KYC_MOCK=true                          # set false in production
KYC_PROVIDER_URL=https://api.verifyme.ng/v1
KYC_API_KEY=your_verifyme_api_key

# Disbursement webhook secret (HMAC-SHA256)
DISBURSEMENT_WEBHOOK_SECRET=your_secret_here
```

---

## Database Migration

After adding the new Prisma models, generate and run the migration:

```bash
npx prisma migrate dev --name fintech_os_init
npx prisma generate
```

New tables created:
- `loan_applications`
- `loan_documents`
- `kyc_records`
- `loan_reminders`

---

## Twilio Webhook Configuration

1. Log in to [console.twilio.com](https://console.twilio.com).
2. Navigate to **Messaging → Senders → WhatsApp Senders**.
3. Select your WhatsApp-enabled number.
4. Under **Messaging Configuration**, set the incoming webhook URL to:
   ```
   https://your-domain.com/api/webhooks/whatsapp-loan
   ```
5. Method: **HTTP POST**
6. Copy your **Auth Token** into `TWILIO_AUTH_TOKEN`.

The endpoint validates the `X-Twilio-Signature` header on every request.
During local development, signature validation is skipped if `TWILIO_AUTH_TOKEN`
is not set.

---

## KYC Mock Mode

Set `KYC_MOCK=true` (default in `.env.example`) to bypass the real VerifyMe API.

Mock behaviour:
- BVNs starting with `000` → `verified: false`
- All other valid 11-digit BVNs → `verified: true` with placeholder data
- Invalid format → validation error

---

## Disbursement Webhook

External disbursement systems POST to `/api/webhooks/disbursement`:

```http
POST /api/webhooks/disbursement
X-Disbursement-Signature: <HMAC-SHA256 of raw body using DISBURSEMENT_WEBHOOK_SECRET>
Content-Type: application/json

{
  "loanApplicationId": "clxxxxx",
  "reference": "DISB-2026-001"
}
```

The endpoint:
1. Verifies the HMAC signature.
2. Updates the loan status to `DISBURSED`.
3. Sends a WhatsApp congratulations message to the applicant.

---

## Running the Recovery Bot Worker

The loan reminder worker processes the `loan-reminders` BullMQ queue. Start it
alongside the Next.js process:

```bash
npx tsx src/workers/loan-reminder-worker.ts
```

Or add to `Procfile` / ECS task definition:

```
worker-loan: npx tsx src/workers/loan-reminder-worker.ts
```

Workers respect Nigerian quiet hours (22:00–07:00 WAT). Jobs fired during
quiet hours are automatically re-queued for 1 hour later.

---

## Admin Dashboard

Visit `/dashboard/loans` when logged in as an admin/operator to:

- Filter applications by status or search by name/phone.
- Click **View** to open the detail page.
- Run KYC verification (POST `/api/kyc/verify`).
- Approve → triggers WhatsApp disbursement notification.
- Reject → sends WhatsApp rejection message with reason.
- **Message** → free-form WhatsApp message with quick-reply templates.

---

## Running Tests

```bash
pnpm test
# or specifically:
pnpm vitest run tests/lib/kyc/bvn.test.ts
pnpm vitest run tests/lib/whatsapp/loan-bot.test.ts
pnpm vitest run tests/api/webhooks/whatsapp-loan.test.ts
```

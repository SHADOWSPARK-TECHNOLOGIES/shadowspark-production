# ShadowSpark Launch Environment Checklist

Before pushing live traffic to Vercel/Railway, verify that the following Environment Variables are configured in your production settings:

### Critical for Monetization & Automations
- [ ] `FIRECRAWL_API_KEY` - Required to trigger automated crawls upon successful Paystack checkout.
- [ ] `PAYSTACK_SECRET_KEY` / `PAYSTACK_WEBHOOK_SECRET` - Required to verify webhook signatures.
- [ ] `DATABASE_URL` - Production PostgreSQL connection string.

### Telemetry & Operator Visibility
- [ ] `SLACK_WEBHOOK_URL` - Required for instant operator notification of a new lead/payment.

### Intelligence & Assistant
- [ ] `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`) - Required for the Assistant bubble's graceful degradation / fallback logic when vault context is missing.
- [ ] `VAULT_BUCKET` (Optional) - If you are using a non-default GCS bucket for markdown audits.

Once these are set in your production host, the launch path is clear.

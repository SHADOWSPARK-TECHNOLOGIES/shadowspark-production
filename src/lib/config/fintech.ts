/**
 * Fintech OS configuration — Twilio, KYC provider, disbursement webhook.
 *
 * All values read from environment variables. Safe defaults keep the app
 * bootable in local dev without real credentials when mock flags are set.
 */

export const fintechConfig = {
  // ── Twilio WhatsApp ─────────────────────────────────────────────────────
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    /** Twilio WhatsApp sender number e.g. "whatsapp:+14155238886" */
    from: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
  },

  // ── KYC Provider (VerifyMe / IdentityPass) ──────────────────────────────
  kyc: {
    providerUrl: process.env.KYC_PROVIDER_URL ?? "https://api.verifyme.ng/v1",
    apiKey: process.env.KYC_API_KEY ?? "",
    /** Set KYC_MOCK=true in .env to skip real API calls during development */
    mock: process.env.KYC_MOCK === "true",
  },

  // ── Disbursement webhook ────────────────────────────────────────────────
  disbursement: {
    webhookSecret: process.env.DISBURSEMENT_WEBHOOK_SECRET ?? "",
  },
} as const;

export const config = {
  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  aiCoreUrl: process.env.AI_CORE_URL || "http://localhost:4001",

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Auth
  authSecret: process.env.AUTH_SECRET!,
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID || "localhost",
    rpName: process.env.WEBAUTHN_RP_NAME || "ShadowSpark",
    origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:3000",
  },

  // Payments
  paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
    // Paystack egress IPs for webhook source validation
    allowedIps: ["52.31.139.75", "52.49.173.169", "52.214.14.220"],
  },

  // WhatsApp (Meta Business API)
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0",
    accessToken: process.env.WHATSAPP_API_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  },

  // OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  // Feature flags
  features: {
    paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
    oauthEnabled: process.env.OAUTH_ENABLED === "true",
    whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
  },
} as const;

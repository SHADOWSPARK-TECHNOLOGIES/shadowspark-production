export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "AUTH_SECRET",
  ];

  const conditionalOnPayments = [
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_PUBLIC_KEY",
  ];

  const conditionalOnOAuth = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];

  const conditionalOnWhatsApp = [
    "WHATSAPP_API_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]?.trim()) missing.push(key);
  }

  if (process.env.PAYMENTS_ENABLED === "true") {
    for (const key of conditionalOnPayments) {
      if (!process.env[key]?.trim()) missing.push(key);
    }
    const sk = process.env.PAYSTACK_SECRET_KEY ?? "";
    if (sk && !sk.startsWith("sk_")) {
      throw new Error(`FATAL: PAYSTACK_SECRET_KEY must start with "sk_". Got: ${sk.slice(0, 6)}...`);
    }
  }

  if (process.env.OAUTH_ENABLED === "true") {
    for (const key of conditionalOnOAuth) {
      if (!process.env[key]?.trim()) missing.push(key);
    }
  }

  if (process.env.WHATSAPP_ENABLED === "true") {
    for (const key of conditionalOnWhatsApp) {
      if (!process.env[key]?.trim()) missing.push(key);
    }
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl && !dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    throw new Error(`FATAL: DATABASE_URL must start with "postgresql://" or "postgres://". Got: ${dbUrl.slice(0, 20)}...`);
  }

  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\nServer cannot start.`
    );
  }

  console.log(
    "[boot] Features: payments=%s oauth=%s whatsapp=%s",
    process.env.PAYMENTS_ENABLED ?? "false",
    process.env.OAUTH_ENABLED ?? "false",
    process.env.WHATSAPP_ENABLED ?? "false"
  );
}

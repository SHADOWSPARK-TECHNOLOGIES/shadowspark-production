/**
 * GCP Secret Manager integration
 * Replaces all hardcoded env vars with Secret Manager lookups
 * Use in production — falls back to process.env for local dev
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

export async function getSecret(secretName: string): Promise<string> {
  // Local dev: use .env directly
  if (process.env.NODE_ENV !== 'production') {
    const value = process.env[secretName];
    if (!value) throw new Error(`Missing env var: ${secretName}`);
    return value;
  }

  // Production: fetch from Secret Manager
  const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();
  if (!payload) throw new Error(`Secret ${secretName} is empty`);
  return payload;
}

// Pre-load all secrets at startup (call in instrumentation.ts)
export async function loadAllSecrets(): Promise<Record<string, string>> {
  const secretNames = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'PAYSTACK_SECRET_KEY',
    'RESEND_API_KEY',
    'GOOGLE_AI_API_KEY',
    'REDIS_URL',
    'WHATSAPP_API_TOKEN',
  ];

  const secrets: Record<string, string> = {};
  await Promise.all(
    secretNames.map(async (name) => {
      secrets[name] = await getSecret(name);
    })
  );
  return secrets;
}

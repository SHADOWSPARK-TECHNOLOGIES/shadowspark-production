import { createCipheriv, randomBytes, createHash } from "node:crypto";

const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.LOAN_BVN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("LOAN_BVN_ENCRYPTION_KEY is not configured");
  }

  return createHash("sha256").update(rawKey, "utf8").digest();
}

export function encryptSensitiveValue(value: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

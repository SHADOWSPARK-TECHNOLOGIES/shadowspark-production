import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthTokenPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
}

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signInput(input: string): string {
  return createHmac("sha256", Buffer.from(getJwtSecret()))
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function signAuthToken(
  payload: AuthTokenPayload,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = {
    sub: payload.sub,
    role: payload.role,
    email: payload.email,
    tenantId: payload.tenantId,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signInput(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid token format");
  }

  const signedPart = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signInput(signedPart);
  const signatureBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const parsedPayload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<JwtPayload>;
  if (
    typeof parsedPayload.sub !== "string" ||
    typeof parsedPayload.tenantId !== "string" ||
    typeof parsedPayload.role !== "string" ||
    typeof parsedPayload.email !== "string" ||
    typeof parsedPayload.exp !== "number"
  ) {
    throw new Error("Invalid token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (parsedPayload.exp <= now) {
    throw new Error("Token expired");
  }

  return {
    sub: parsedPayload.sub,
    tenantId: parsedPayload.tenantId,
    role: parsedPayload.role,
    email: parsedPayload.email,
  };
}

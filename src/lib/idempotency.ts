import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const TTL_SECONDS = 86400;
const LOCK_TTL_SECONDS = 300;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
const DATABASE_CLAIM_TTL_MS = 5 * 60 * 1000;
const DATABASE_RESPONSE_TTL_MS = TTL_SECONDS * 1000;
const IN_PROGRESS_RESPONSE = {
  success: false,
  error: {
    code: "IDEMPOTENCY_IN_PROGRESS",
    message: "A request with this Idempotency-Key is already in progress",
  },
};
const ENCRYPTED_RESPONSE_MARKER = "aes-256-gcm-v1";
const encryptedDatabaseResponseSchema = z
  .object({
    encrypted: z.literal(ENCRYPTED_RESPONSE_MARKER),
    initializationVector: z.string().min(1),
    authenticationTag: z.string().min(1),
    ciphertext: z.string().min(1),
  })
  .strict();
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

/** Generates a collision-resistant idempotency key with a caller-supplied prefix. */
export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Finds a cached mutation response within one tenant's idempotency namespace. */
export async function checkIdempotency(
  tenantId: string,
  idempotencyKey: string
): Promise<
  { isDuplicate: true; cachedResponse: unknown; statusCode: number } | { isDuplicate: false }
> {
  const key = `idempotency:${tenantId}:${idempotencyKey}`;
  if (redis === null) return { isDuplicate: false };

  const cached = await redis.get(key);
  if (!cached) {
    return { isDuplicate: false };
  }

  const parsed = JSON.parse(cached) as { response: unknown; statusCode: number };
  return {
    isDuplicate: true,
    cachedResponse: parsed.response,
    statusCode: parsed.statusCode,
  };
}

/** Stores a successful mutation response for deterministic replay. */
export async function storeIdempotency(
  tenantId: string,
  idempotencyKey: string,
  response: unknown,
  statusCode: number
): Promise<void> {
  if (redis === null) return;

  const key = `idempotency:${tenantId}:${idempotencyKey}`;
  await redis.setex(
    key,
    TTL_SECONDS,
    JSON.stringify({ response, statusCode, createdAt: new Date().toISOString() })
  );
}

async function acquireIdempotencyLock(tenantId: string, idempotencyKey: string): Promise<string | null> {
  if (redis === null) return null;

  const lockKey = `idempotency-lock:${tenantId}:${idempotencyKey}`;
  const owner = crypto.randomUUID();
  const acquired = await redis.set(lockKey, owner, "EX", LOCK_TTL_SECONDS, "NX");
  return acquired === "OK" ? owner : null;
}

async function releaseIdempotencyLock(tenantId: string, idempotencyKey: string, owner: string): Promise<void> {
  if (redis === null) return;

  const lockKey = `idempotency-lock:${tenantId}:${idempotencyKey}`;
  await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, owner);
}

function isMutationMethod(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized === "POST" || normalized === "PATCH" || normalized === "PUT" || normalized === "DELETE";
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.clone().text();
  if (text.trim().length === 0) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

function databaseResponse(response: object, status: number, replayed = false): Response {
  const result = NextResponse.json(response, { status });
  if (replayed) result.headers.set("Idempotency-Replayed", "true");
  return result;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function readDatabaseResponseBody(response: Response): Promise<object> {
  const text = await response.clone().text();
  if (text.trim().length === 0) return {};

  const parsed = z.json().parse(JSON.parse(text));
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? parsed
    : { value: parsed };
}

function databaseEncryptionKey(): Buffer {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error("AUTH_SECRET is required for database-backed idempotency");
  }
  return createHash("sha256").update(authSecret).digest();
}

function idempotencyAdditionalData(tenantId: string, idempotencyKey: string): Buffer {
  return Buffer.from(`${tenantId}\u0000${idempotencyKey}`, "utf8");
}

function encryptDatabaseResponse(
  response: object,
  tenantId: string,
  idempotencyKey: string,
): z.infer<typeof encryptedDatabaseResponseSchema> {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", databaseEncryptionKey(), initializationVector);
  cipher.setAAD(idempotencyAdditionalData(tenantId, idempotencyKey));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf8"),
    cipher.final(),
  ]);

  return {
    encrypted: ENCRYPTED_RESPONSE_MARKER,
    initializationVector: initializationVector.toString("base64url"),
    authenticationTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

function normalizeDatabaseResponse(response: unknown): object {
  return typeof response === "object" && response !== null && !Array.isArray(response)
    ? response
    : { value: response };
}

function decryptDatabaseResponse(
  response: z.infer<typeof encryptedDatabaseResponseSchema>,
  tenantId: string,
  idempotencyKey: string,
): object {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    databaseEncryptionKey(),
    Buffer.from(response.initializationVector, "base64url"),
  );
  decipher.setAAD(idempotencyAdditionalData(tenantId, idempotencyKey));
  decipher.setAuthTag(Buffer.from(response.authenticationTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(response.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return normalizeDatabaseResponse(z.json().parse(JSON.parse(plaintext)));
}

async function findDatabaseResponse(
  tenantId: string,
  idempotencyKey: string,
): Promise<Response | null> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { tenantId_key: { tenantId, key: idempotencyKey } },
  });
  if (!existing) return null;

  if (existing.expiresAt <= new Date()) {
    await prisma.idempotencyKey.deleteMany({
      where: { id: existing.id, expiresAt: { lte: new Date() } },
    });
    return null;
  }

  if (existing.statusCode === 409) {
    return databaseResponse(IN_PROGRESS_RESPONSE, 409);
  }

  const encrypted = encryptedDatabaseResponseSchema.safeParse(existing.response);
  const stored = encrypted.success
    ? decryptDatabaseResponse(encrypted.data, tenantId, idempotencyKey)
    : normalizeDatabaseResponse(existing.response);
  return databaseResponse(stored, existing.statusCode, true);
}

async function withDatabaseIdempotency(
  tenantId: string,
  idempotencyKey: string,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  const existing = await findDatabaseResponse(tenantId, idempotencyKey);
  if (existing) return existing;

  try {
    await prisma.idempotencyKey.create({
      data: {
        tenantId,
        key: idempotencyKey,
        statusCode: 409,
        response: IN_PROGRESS_RESPONSE,
        expiresAt: new Date(Date.now() + DATABASE_CLAIM_TTL_MS),
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    return (
      (await findDatabaseResponse(tenantId, idempotencyKey)) ??
      databaseResponse(IN_PROGRESS_RESPONSE, 409)
    );
  }

  try {
    const response = await handler();
    if (response.status >= 200 && response.status < 300) {
      await prisma.idempotencyKey.update({
        where: { tenantId_key: { tenantId, key: idempotencyKey } },
        data: {
          statusCode: response.status,
          response: encryptDatabaseResponse(
            await readDatabaseResponseBody(response),
            tenantId,
            idempotencyKey,
          ),
          expiresAt: new Date(Date.now() + DATABASE_RESPONSE_TTL_MS),
        },
      });
    } else {
      await prisma.idempotencyKey.deleteMany({
        where: { tenantId, key: idempotencyKey },
      });
    }

    return response;
  } catch (error) {
    await prisma.idempotencyKey.deleteMany({
      where: { tenantId, key: idempotencyKey },
    });
    throw error;
  }
}

/**
 * Requires an idempotency key for mutations, serializes concurrent uses, and
 * replays the first successful response for the same tenant and key.
 */
export async function withIdempotency(
  request: Request,
  tenantId: string,
  handler: () => Promise<Response> | Response
): Promise<Response> {
  if (!isMutationMethod(request.method)) {
    return handler();
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for mutations",
        },
      },
      { status: 400 }
    );
  }

  if (idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_IDEMPOTENCY_KEY",
          message: `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
        },
      },
      { status: 400 }
    );
  }

  if (redis === null) {
    return withDatabaseIdempotency(tenantId, idempotencyKey, handler);
  }

  const check = await checkIdempotency(tenantId, idempotencyKey);
  if (check.isDuplicate) {
    const replay = NextResponse.json(check.cachedResponse, { status: check.statusCode });
    replay.headers.set("Idempotency-Replayed", "true");
    return replay;
  }

  const lockOwner = await acquireIdempotencyLock(tenantId, idempotencyKey);
  if (!lockOwner) {
    const completed = await checkIdempotency(tenantId, idempotencyKey);
    if (completed.isDuplicate) {
      const replay = NextResponse.json(completed.cachedResponse, { status: completed.statusCode });
      replay.headers.set("Idempotency-Replayed", "true");
      return replay;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "IDEMPOTENCY_IN_PROGRESS",
          message: "A request with this Idempotency-Key is already in progress",
        },
      },
      { status: 409, headers: { "Retry-After": "1" } }
    );
  }

  try {
    const completed = await checkIdempotency(tenantId, idempotencyKey);
    if (completed.isDuplicate) {
      const replay = NextResponse.json(completed.cachedResponse, { status: completed.statusCode });
      replay.headers.set("Idempotency-Replayed", "true");
      return replay;
    }

    const response = await handler();
    if (response.status >= 200 && response.status < 300) {
      const body = await readResponseBody(response);
      await storeIdempotency(tenantId, idempotencyKey, body, response.status);
    }

    return response;
  } finally {
    await releaseIdempotencyLock(tenantId, idempotencyKey, lockOwner);
  }
}

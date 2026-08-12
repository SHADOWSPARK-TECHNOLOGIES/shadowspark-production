import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

const TTL_SECONDS = 86400;
const LOCK_TTL_SECONDS = 300;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
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
  const key = `idempotency:${tenantId}:${idempotencyKey}`;
  await redis.setex(
    key,
    TTL_SECONDS,
    JSON.stringify({ response, statusCode, createdAt: new Date().toISOString() })
  );
}

async function acquireIdempotencyLock(tenantId: string, idempotencyKey: string): Promise<string | null> {
  const lockKey = `idempotency-lock:${tenantId}:${idempotencyKey}`;
  const owner = crypto.randomUUID();
  const acquired = await redis.set(lockKey, owner, "EX", LOCK_TTL_SECONDS, "NX");
  return acquired === "OK" ? owner : null;
}

async function releaseIdempotencyLock(tenantId: string, idempotencyKey: string, owner: string): Promise<void> {
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

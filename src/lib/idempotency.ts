import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = "idempotency";

interface CachedResponse {
  statusCode: number;
  response: unknown;
  createdAt: string;
}

export class MissingIdempotencyKeyError extends Error {
  constructor() {
    super("Idempotency-Key header is required for this request");
    this.name = "MissingIdempotencyKeyError";
  }
}

export class IdempotencyConflict extends Error {
  constructor(public readonly cachedResponse: Response) {
    super("Idempotency conflict");
    this.name = "IdempotencyConflict";
  }
}

function buildKey(tenantId: string, key: string): string {
  return `${KEY_PREFIX}:${tenantId}:${key}`;
}

export async function getCachedResponse(
  tenantId: string,
  key: string,
): Promise<Response | null> {
  const raw = await redis.get(buildKey(tenantId, key));
  if (!raw) return null;

  const cached = JSON.parse(raw as string) as CachedResponse;
  return new Response(JSON.stringify(cached.response), {
    status: cached.statusCode,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Replayed": "true",
    },
  });
}

export async function cacheResponse(
  tenantId: string,
  key: string,
  response: Response,
): Promise<void> {
  const cloned = response.clone();
  let body: unknown;
  try {
    body = await cloned.json();
  } catch {
    body = null;
  }

  const cached: CachedResponse = {
    statusCode: response.status,
    response: body,
    createdAt: new Date().toISOString(),
  };

  await redis.setex(
    buildKey(tenantId, key),
    IDEMPOTENCY_TTL_SECONDS,
    JSON.stringify(cached),
  );
}

/**
 * Execute a mutation handler with Redis-backed idempotency.
 *
 * - Requires `Idempotency-Key` header — returns 400 if missing.
 * - On first call: executes handler, caches (tenantId, key, status, response) in Redis with 24h TTL.
 * - On repeat call: returns cached response with original status code and `Idempotency-Replayed: true`.
 */
export async function withIdempotency(
  request: Request,
  tenantId: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.trim() === "") {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for this request",
        },
      },
      { status: 400 },
    );
  }

  const cached = await getCachedResponse(tenantId, key);
  if (cached) {
    return cached;
  }

  const response = await handler();
  await cacheResponse(tenantId, key, response);
  return response;
}

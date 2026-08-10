import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

const TTL_SECONDS = 86400;

export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

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

  const check = await checkIdempotency(tenantId, idempotencyKey);
  if (check.isDuplicate) {
    const replay = NextResponse.json(check.cachedResponse, { status: check.statusCode });
    replay.headers.set("Idempotency-Replayed", "true");
    return replay;
  }

  const response = await handler();
  if (response.status >= 200 && response.status < 300) {
    const body = await readResponseBody(response);
    await storeIdempotency(tenantId, idempotencyKey, body, response.status);
  }

  return response;
}

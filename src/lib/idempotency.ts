import { redis } from "@/lib/redis";

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

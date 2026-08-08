import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyConflict extends Error {
  constructor(public readonly cachedResponse: Response) {
    super("Idempotency conflict");
  }
}

/**
 * Enforce idempotency on mutation routes.
 *
 * - Requires `Idempotency-Key` header — returns 400 if missing.
 * - On first call: executes handler, stores (tenantId, key, status, response).
 * - On repeat call: returns stored response with original status code.
 */
export async function withIdempotency(
  request: Request,
  tenantId: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.trim() === "") {
    return NextResponse.json(
      { error: { code: "MISSING_IDEMPOTENCY_KEY", message: "Idempotency-Key header is required for this request" } },
      { status: 400 },
    );
  }

  const existing = await prisma.idempotencyKey.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });

  if (existing) {
    return new Response(JSON.stringify(existing.response), {
      status: existing.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Replayed": "true",
      },
    });
  }

  const response = await handler();
  const cloned = response.clone();
  let body: unknown;
  try { body = await cloned.json(); } catch { body = null; }

  await prisma.idempotencyKey.create({
    data: {
      tenantId,
      key,
      statusCode: response.status,
      response: body as object,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    },
  });

  return response;
}

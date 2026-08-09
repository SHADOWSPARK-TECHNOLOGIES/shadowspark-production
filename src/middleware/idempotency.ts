import { NextResponse } from "next/server";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

function isMutationMethod(method: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.clone().text();

  if (text.trim().length === 0) {
    return null;
  }

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
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  if (!isMutationMethod(request.method.toUpperCase())) {
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
    return NextResponse.json(check.cachedResponse, { status: check.statusCode });
  }

  const response = await handler();
  if (response.status >= 200 && response.status < 300) {
    const body = await readResponseBody(response);
    await storeIdempotency(tenantId, idempotencyKey, body, response.status);
  }

  return response;
}

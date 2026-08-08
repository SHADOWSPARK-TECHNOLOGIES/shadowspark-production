import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { listMessages, validateMessagesQuery } from "@/lib/api/v1/message-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const query = validateMessagesQuery(new URL(request.url).searchParams);
    const result = await runWithTenantContext(authResult.context.tenantId, () =>
      listMessages(query, authResult.context.tenantId)
    );

    return withCors(successResponse(result), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(errorResponse(400, "INVALID_QUERY", error.issues[0]?.message ?? "Invalid query"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch messages"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

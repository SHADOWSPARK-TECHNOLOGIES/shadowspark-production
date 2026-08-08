import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { runWithTenantContext } from "@/lib/tenant-context";
import { listMessageConversations } from "@/lib/api/v1/message-service";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const conversations = await runWithTenantContext(authResult.context.tenantId, () =>
      listMessageConversations(authResult.context.tenantId)
    );

    return withCors(successResponse(conversations), request, METHODS);
  } catch {
    return withCors(
      errorResponse(500, "INTERNAL_ERROR", "Failed to fetch message conversations"),
      request,
      METHODS
    );
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}


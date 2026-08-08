export const dynamic = 'force-dynamic';

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { revokeApiKey } from "@/lib/api/v1/api-key-service";

const METHODS = "DELETE, OPTIONS";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      const revoked = await revokeApiKey(auth.context.tenantId, id, auth.context.userId);
      if (!revoked) return errorResponse(404, "NOT_FOUND", "API key not found");
      return successResponse(revoked);
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

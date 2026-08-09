export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { updateSettings, updateSettingsSchema, listSettingsChanges } from "@/lib/api/v1/settings-service";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") ?? undefined;
    const changes = await listSettingsChanges(auth.context.tenantId, category);
    return withCors(successResponse(changes), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to list settings changes"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = updateSettingsSchema.parse(body);
        const change = await updateSettings(auth.context.tenantId, input, auth.context.userId);
        return successResponse(change, 201);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to update settings");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

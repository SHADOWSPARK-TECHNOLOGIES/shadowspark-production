export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { inviteUser, inviteUserSchema, listInvitations } from "@/lib/api/v1/invitation-service";

const METHODS = "GET, POST, OPTIONS";

export async function GET(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  try {
    const invitations = await listInvitations(auth.context.tenantId);
    return withCors(successResponse(invitations), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to list invitations"), request, METHODS);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const input = inviteUserSchema.parse(body);
        const invitation = await inviteUser(auth.context.tenantId, input, auth.context.userId);
        return successResponse(invitation, 201);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        if (error instanceof Error && error.message === "INVITATION_ALREADY_PENDING") {
          return errorResponse(409, "INVITATION_ALREADY_PENDING", "An active invitation already exists for this email");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to invite user");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

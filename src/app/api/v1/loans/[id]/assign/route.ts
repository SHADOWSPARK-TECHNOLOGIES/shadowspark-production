export const dynamic = 'force-dynamic';

import { ZodError } from "zod";
import { z } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { withIdempotency } from "@/middleware/idempotency";
import { assignLoan } from "@/lib/api/v1/loan-service";

const METHODS = "POST, OPTIONS";

const assignSchema = z.object({
  assignedToId: z.string().trim().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext(request);
  if (!auth.ok) return withCors(auth.response, request, METHODS);
  const { id } = await params;

  return withCors(
    await withIdempotency(request, auth.context.tenantId, async () => {
      try {
        const body = await request.json();
        const { assignedToId } = assignSchema.parse(body);
        const updated = await assignLoan(auth.context.tenantId, id, assignedToId, auth.context.userId);
        if (!updated) return errorResponse(404, "NOT_FOUND", "Loan not found");
        return successResponse(updated);
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body");
        }
        return errorResponse(500, "INTERNAL_ERROR", "Failed to assign loan");
      }
    }),
    request,
    METHODS,
  );
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

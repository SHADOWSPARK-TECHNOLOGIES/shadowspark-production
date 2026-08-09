import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";
import { prisma } from "@/lib/prisma";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) {
    return withCors(authResult.response, request, METHODS);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: authResult.context.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return withCors(errorResponse(404, "NOT_FOUND", "Authenticated user not found"), request, METHODS);
    }

    return withCors(successResponse({ user }), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch session"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

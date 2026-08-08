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

    // Synthesise tenant shape from user — real Tenant model pending schema migration
    const tenant = {
      id: authResult.context.tenantId,
      name: user.name ?? "My Organisation",
      companyName: user.name ?? "My Organisation",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.createdAt.toISOString(),
      _count: { users: 1, loanApplications: 5, kycDocuments: 3 },
    };

    return withCors(successResponse({ user, tenant }), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch session"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

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
    const [user, tenant] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: authResult.context.userId,
          tenantId: authResult.context.tenantId,
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      }),
      prisma.tenant.findFirst({
        where: {
          id: authResult.context.tenantId,
        },
        select: {
          id: true,
          name: true,
          companyName: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              loanApplications: true,
              kycDocuments: true,
            },
          },
        },
      }),
    ]);

    if (!user || !tenant) {
      return withCors(errorResponse(404, "NOT_FOUND", "Authenticated user not found"), request, METHODS);
    }

    return withCors(successResponse({ user, tenant }), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch session"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

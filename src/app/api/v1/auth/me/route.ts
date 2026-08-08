export const dynamic = 'force-dynamic';

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

    const tenant = await prisma.tenant.findFirst({
      where: { id: authResult.context.tenantId },
      include: {
        _count: { select: { users: true, loanApplications: true, kycDocuments: true } },
      },
    });

    if (!tenant) {
      return withCors(errorResponse(404, "NOT_FOUND", "Tenant not found"), request, METHODS);
    }

    return withCors(successResponse({
      user,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        companyName: tenant.companyName,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
        _count: tenant._count,
      },
    }), request, METHODS);
  } catch {
    return withCors(errorResponse(500, "INTERNAL_ERROR", "Failed to fetch session"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

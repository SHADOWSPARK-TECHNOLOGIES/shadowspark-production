import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/api/auth-context";
import { errorResponse } from "@/lib/api/http";

export interface ComplianceAuthContext {
  userId: string;
  tenantId: string;
  role?: string;
  email?: string;
}

export type ComplianceAuthResult =
  | { ok: true; context: ComplianceAuthContext }
  | { ok: false; response: Response };

const AUTHORIZED_ROLES = new Set(["ADMIN", "OWNER", "COMPLIANCE", "OPERATOR"]);

function isAuthorized(role?: string | null): boolean {
  return role ? AUTHORIZED_ROLES.has(role.trim().toUpperCase()) : false;
}

/**
 * Resolves authentication context for compliance routes:
 * 1. Checks Bearer JWT via requireAuthContext(request).
 * 2. If no Bearer header, checks NextAuth session via auth().
 *    When session is valid, resolves authoritative tenantId from prisma.tenantMembership.
 *    Fails closed with HTTP 403 Forbidden if membership is missing or role is unauthorized.
 */
export async function resolveComplianceAuth(request: Request): Promise<ComplianceAuthResult> {
  const authResult = await requireAuthContext(request);
  if (authResult.ok) {
    if (!isAuthorized(authResult.context.role)) {
      return {
        ok: false,
        response: errorResponse(403, "FORBIDDEN", "Unauthorized role for compliance operations"),
      };
    }
    return {
      ok: true,
      context: {
        userId: authResult.context.userId,
        tenantId: authResult.context.tenantId,
        role: authResult.context.role,
        email: authResult.context.email,
      },
    };
  }

  // If a Bearer token was provided in Authorization header, fail directly with the Bearer error
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.trim().toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: authResult.response };
  }

  // NextAuth session check for browser requests
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return { ok: false, response: authResult.response };
    }

    // Resolve authoritative tenant from database membership
    const membership = await prisma.tenantMembership.findFirst({
      where: { userId },
      select: { tenantId: true, role: true },
    });

    if (!membership || !membership.tenantId) {
      return {
        ok: false,
        response: errorResponse(403, "FORBIDDEN", "Tenant membership required"),
      };
    }

    // Role check: must have authorized role
    const sessionRole = (session.user as { role?: string })?.role;
    const membershipRole = membership.role;
    if (!isAuthorized(membershipRole) && !isAuthorized(sessionRole)) {
      return {
        ok: false,
        response: errorResponse(403, "FORBIDDEN", "Unauthorized role for compliance operations"),
      };
    }

    return {
      ok: true,
      context: {
        userId,
        tenantId: membership.tenantId,
        role: membershipRole || sessionRole || "ADMIN",
        email: session.user?.email ?? undefined,
      },
    };
  } catch {
    return { ok: false, response: authResult.response };
  }
}

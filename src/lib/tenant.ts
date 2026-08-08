import { prisma } from "@/lib/prisma";
import type { AuthTokenPayload } from "@/lib/auth";

const TENANT_HINT_HEADER = "x-tenant-slug";

export function getTenantHeaderValue(request: Request): string | null {
  const rawTenantSlug = request.headers.get(TENANT_HINT_HEADER);
  if (!rawTenantSlug) {
    return null;
  }

  const tenantSlug = rawTenantSlug.trim();
  return tenantSlug.length > 0 ? tenantSlug : null;
}

export async function resolveTenantIdFromRequest(
  request: Request,
  tokenPayload: AuthTokenPayload
): Promise<string> {
  const tenantSlugHint = getTenantHeaderValue(request);
  if (tenantSlugHint) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tokenPayload.tenantId },
      select: {
        name: true,
        companyName: true,
      },
    });

    const matchesTenant =
      tenant?.name === tenantSlugHint || tenant?.companyName === tenantSlugHint;

    if (!matchesTenant) {
      throw new Error("TENANT_MISMATCH");
    }
  }

  return tokenPayload.tenantId;
}

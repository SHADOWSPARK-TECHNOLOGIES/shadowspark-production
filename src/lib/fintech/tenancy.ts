import { NextRequest } from "next/server";

export function resolveTenantId(req: NextRequest): string | null {
  return req.headers.get("x-tenant-id") ?? req.nextUrl.searchParams.get("tenantId");
}

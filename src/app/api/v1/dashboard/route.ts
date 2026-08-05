import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";
import { resolveTenantId } from "@/lib/fintech/tenancy";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return errorResponse("TENANT_REQUIRED", "x-tenant-id header is required", 400);
  try {
    const metrics = await getDashboardMetrics(tenantId);
    return NextResponse.json({ data: metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load metrics";
    return errorResponse(message === "TENANT_NOT_FOUND" ? "TENANT_NOT_FOUND" : "DASHBOARD_LOAD_FAILED", message, message === "TENANT_NOT_FOUND" ? 404 : 400);
  }
}

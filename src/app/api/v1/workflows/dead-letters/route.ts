import { NextRequest, NextResponse } from "next/server";
import { listDeadLetters } from "@/lib/workflows/service";
import { errorResponse } from "@/lib/fintech/errors";
import { resolveTenantId } from "@/lib/fintech/tenancy";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return errorResponse("TENANT_REQUIRED", "x-tenant-id header is required", 400);
  try {
    const data = await listDeadLetters(tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse("WORKFLOW_DEAD_LETTERS_LOAD_FAILED", error instanceof Error ? error.message : "Unable to load dead letters", 400);
  }
}

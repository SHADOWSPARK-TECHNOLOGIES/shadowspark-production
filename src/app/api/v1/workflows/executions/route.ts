import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/fintech/errors";
import { resolveTenantId } from "@/lib/fintech/tenancy";
import { listWorkflowExecutions, triggerWorkflow } from "@/lib/workflows/service";
import { scheduleWorkflowExecution } from "@/lib/workflows/runtime";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return errorResponse("TENANT_REQUIRED", "x-tenant-id header is required", 400);
  try {
    const data = await listWorkflowExecutions(tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse("WORKFLOW_EXECUTIONS_LOAD_FAILED", error instanceof Error ? error.message : "Unable to load workflow executions", 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const execution = await triggerWorkflow(body);
    await scheduleWorkflowExecution(execution.id);
    return NextResponse.json({ data: execution }, { status: 202 });
  } catch (error) {
    return errorResponse("WORKFLOW_TRIGGER_FAILED", error instanceof Error ? error.message : "Unable to trigger workflow", 400);
  }
}

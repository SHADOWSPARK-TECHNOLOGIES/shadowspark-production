import { NextResponse } from "next/server";
import { getWorkflowExecution } from "@/lib/workflows/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const execution = await getWorkflowExecution(id);
  if (!execution) return errorResponse("WORKFLOW_EXECUTION_NOT_FOUND", "Workflow execution not found", 404);
  return NextResponse.json({ data: execution });
}

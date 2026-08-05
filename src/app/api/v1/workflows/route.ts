import { NextRequest, NextResponse } from "next/server";
import { createWorkflowDefinition } from "@/lib/workflows/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const workflow = await createWorkflowDefinition(await req.json());
    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (error) {
    return errorResponse("WORKFLOW_CREATE_FAILED", error instanceof Error ? error.message : "Unable to create workflow", 400);
  }
}

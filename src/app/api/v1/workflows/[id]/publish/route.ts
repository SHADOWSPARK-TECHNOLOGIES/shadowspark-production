import { NextRequest, NextResponse } from "next/server";
import { publishWorkflowDefinition } from "@/lib/workflows/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const version = await publishWorkflowDefinition(id);
    return NextResponse.json({ data: version });
  } catch (error) {
    return errorResponse("WORKFLOW_PUBLISH_FAILED", error instanceof Error ? error.message : "Unable to publish workflow", 400);
  }
}

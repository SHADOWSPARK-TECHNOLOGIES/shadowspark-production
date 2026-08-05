import { NextRequest, NextResponse } from "next/server";
import { createCreditBureauPull } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const record = await createCreditBureauPull(await req.json());
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return errorResponse("CREDIT_PULL_CREATE_FAILED", error instanceof Error ? error.message : "Unable to create credit pull", 400);
  }
}

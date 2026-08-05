import { NextRequest, NextResponse } from "next/server";
import { createLoanApplication } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const application = await createLoanApplication(body);
    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    return errorResponse("LOAN_CREATE_FAILED", error instanceof Error ? error.message : "Unable to create loan", 400);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyLoanKyc } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await verifyLoanKyc(body);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify KYC";
    return errorResponse(message === "APPLICATION_NOT_FOUND" ? "APPLICATION_NOT_FOUND" : "KYC_VERIFY_FAILED", message, message === "APPLICATION_NOT_FOUND" ? 404 : 400);
  }
}

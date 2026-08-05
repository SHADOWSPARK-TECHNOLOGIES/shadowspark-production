import { NextRequest, NextResponse } from "next/server";
import { createDisbursementEvent } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const event = await createDisbursementEvent(await req.json());
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create disbursement";
    return errorResponse(message === "APPLICATION_NOT_FOUND" ? "APPLICATION_NOT_FOUND" : "DISBURSEMENT_CREATE_FAILED", message, message === "APPLICATION_NOT_FOUND" ? 404 : 400);
  }
}

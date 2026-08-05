import { NextRequest, NextResponse } from "next/server";
import { createReminderSequence } from "@/lib/fintech/service";
import { errorResponse } from "@/lib/fintech/errors";

export async function POST(req: NextRequest) {
  try {
    const sequence = await createReminderSequence(await req.json());
    return NextResponse.json({ data: sequence }, { status: 201 });
  } catch (error) {
    return errorResponse("REMINDER_SEQUENCE_CREATE_FAILED", error instanceof Error ? error.message : "Unable to create reminder sequence", 400);
  }
}

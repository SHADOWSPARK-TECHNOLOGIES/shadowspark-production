import { NextResponse } from "next/server";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { runWithTenantContext } from "@/lib/tenant-context";
import { twilioEmptyResponseXml } from "@/lib/twilio";
import { processTwilioWebhook } from "@/lib/api/v1/twilio-webhook-service";

const METHODS = "POST, OPTIONS";
const DEFAULT_TENANT_ID = process.env.TWILIO_LOAN_TENANT_ID?.trim() || "public";

function xmlResponse(status = 200): NextResponse {
  return new NextResponse(twilioEmptyResponseXml(), {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-twilio-signature");

    await runWithTenantContext(DEFAULT_TENANT_ID, () =>
      processTwilioWebhook({
        rawBody,
        requestUrl: request.url,
        twilioSignature: signature,
        tenantId: DEFAULT_TENANT_ID,
      })
    );

    return withCors(xmlResponse(200), request, METHODS);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TWILIO_SIGNATURE") {
      return withCors(
        NextResponse.json({ error: "Invalid Twilio signature", code: 403 }, { status: 403 }),
        request,
        METHODS
      );
    }

    if (
      error instanceof Error &&
      (error.message === "INVALID_TWILIO_PAYLOAD" || error.message === "INVALID_TWILIO_PHONE")
    ) {
      return withCors(
        NextResponse.json({ error: "Invalid webhook payload", code: 400 }, { status: 400 }),
        request,
        METHODS
      );
    }

    return withCors(
      NextResponse.json({ error: "Failed to process webhook", code: 500 }, { status: 500 }),
      request,
      METHODS
    );
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

export const dynamic = "force-dynamic";


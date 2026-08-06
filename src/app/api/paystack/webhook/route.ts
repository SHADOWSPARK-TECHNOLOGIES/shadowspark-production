import { NextResponse } from "next/server";
import crypto from "crypto";
import { approvePayment } from "@/lib/payment-approval";

type PaystackCustomField = {
  variable_name?: string;
  value?: string | null;
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) return new Response("No signature", { status: 400 });

  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET || "";
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

  if (hash !== signature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;
    
    // Extract leadId whether it's root level or nested in custom_fields
    let leadId = metadata?.leadId;
    if (!leadId && metadata?.custom_fields) {
      const field = (metadata.custom_fields as PaystackCustomField[]).find(
        (customField) => customField.variable_name === "leadId"
      );
      if (field) leadId = field.value;
    }

    if (!leadId) {
      console.error("[Paystack Webhook] Missing leadId in metadata for reference:", reference);
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    try {
      const tier = (metadata?.tier as string) ?? "starter";
      // Paystack sends amount in kobo; divide by 100 for dollar-equivalent storage
      const amount = event.data.amount / 100;

      const result = await approvePayment(leadId, reference, amount, tier, "webhook");

      if (result.note === "already_processed") {
        console.log(`[Paystack Webhook] Duplicate success event ignored for ${reference}`);
      }

      return NextResponse.json({ status: "ok" });
    } catch (error) {
      console.error("[Paystack Webhook] Transaction failed:", error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ status: "ok" });
}


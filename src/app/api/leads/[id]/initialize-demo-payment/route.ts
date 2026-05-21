import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_FEE_USD } from "@/config/pricing";

/**
 * POST /api/leads/[id]/initialize-demo-payment
 *
 * Initializes a Paystack transaction for a demo_scheduled lead.
 * Returns the authorization_url + access_code for WhatsApp delivery.
 *
 * Flow:
 *   1. Validate lead exists with status=demo_scheduled and has a Demo record
 *   2. Call Paystack transaction.initialize with Nigeria-optimized channels
 *   3. Save the Paystack reference on the Lead for webhook matching
 *   4. Return authorization_url + access_code
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Validate lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { demo: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.status !== "demo_scheduled") {
      return NextResponse.json(
        { error: `Lead status is '${lead.status}', expected 'demo_scheduled'` },
        { status: 400 }
      );
    }

    if (!lead.demo) {
      return NextResponse.json(
        { error: "Lead has no Demo record. Run scheduleDemoForLead() first." },
        { status: 400 }
      );
    }

    // 2. Dedupe guard: reject if lead already has an unresolved paymentRef
    if (lead.paymentRef) {
      // Check if the existing payment is still pending (not yet paid or expired)
      const existingPayment = await prisma.payment.findFirst({
        where: {
          leadId: id,
          reference: lead.paymentRef,
          status: "pending",
        },
      });

      if (existingPayment) {
        return NextResponse.json(
          {
            error: "Lead already has an active payment reference",
            existingReference: lead.paymentRef,
            message: "Use the existing payment link or wait for the current one to expire",
          },
          { status: 409 }
        );
      }

      // Existing paymentRef exists but is not pending (paid/failed/expired) — allow new one
      console.log(
        `[Demo Payment Init] Lead ${id} has stale paymentRef ${lead.paymentRef}, allowing new initialization`
      );
    }

    // 3. Determine amount from demo config tier, fall back to DEMO_FEE_USD
    const config = (lead.demo.config ?? {}) as Record<string, unknown>;
    const tier = (config.tier as string) ?? "starter";
    const amounts: Record<string, number> = {
      starter: 149_00,   // $149 in kobo
      pro: 349_00,       // $349 in kobo
      enterprise: 599_00, // $599 in kobo
    };
    const amountKobo = amounts[tier] ?? DEMO_FEE_USD * 100; // fallback: $10 * 100 = 1000 kobo

    // 3. Build email fallback if lead has no email
    const email = lead.email ?? `${lead.phoneNumber?.replace(/[^0-9]/g, "") ?? "unknown"}@shadowspark-demo.com`;

    // 4. Call Paystack API
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const isMockMode = !secretKey || secretKey.startsWith("mock") || secretKey === "";

    if (isMockMode) {
      // Mock mode — create a pending payment and return a fake URL
      const mockReference = `demo_${id}_${Date.now()}`;

      await prisma.payment.create({
        data: {
          amount: amountKobo,
          status: "pending",
          reference: mockReference,
          leadId: id,
        },
      });

      await prisma.lead.update({
        where: { id },
        data: { paymentRef: mockReference },
      });

      const mockUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?reference=${mockReference}`;

      return NextResponse.json({
        authorization_url: mockUrl,
        access_code: `mock_${id}`,
        reference: mockReference,
        amount_kobo: amountKobo,
        tier,
        is_mock: true,
      });
    }

    // Real Paystack mode
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          metadata: {
            leadId: id,
            demoSlug: lead.demo.slug,
            tier,
            // Also nest in custom_fields for webhook fallback parsing
            custom_fields: [
              {
                display_name: "Lead ID",
                variable_name: "leadId",
                value: id,
              },
              {
                display_name: "Demo Slug",
                variable_name: "demoSlug",
                value: lead.demo.slug,
              },
            ],
          },
          channels: ["card", "bank_transfer", "ussd", "mobile_money"],
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success`,
        }),
      }
    );

    const data = await paystackResponse.json();

    if (!data.status) {
      console.error("[Demo Payment Init] Paystack error:", data);
      return NextResponse.json(
        { error: data.message ?? "Paystack initialization failed" },
        { status: 502 }
      );
    }

    // 5. Save the Paystack reference on the Lead for webhook matching
    await prisma.lead.update({
      where: { id },
      data: { paymentRef: data.data.reference },
    });

    // 6. Create a pending Payment record
    await prisma.payment.create({
      data: {
        amount: amountKobo,
        status: "pending",
        reference: data.data.reference,
        leadId: id,
      },
    });

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      amount_kobo: amountKobo,
      tier,
      is_mock: false,
    });
  } catch (error) {
    console.error("[Demo Payment Init] Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize demo payment" },
      { status: 500 }
    );
  }
}

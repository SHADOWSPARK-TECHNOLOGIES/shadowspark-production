import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueuePaymentNudge } from "@/lib/whatsapp/nudge-queue";

export const runtime = "nodejs";

/**
 * GET /api/cron/nudge-demo-payments
 *
 * Cron job that runs every 2 hours to nudge leads who have unpaid demos.
 *
 * Query logic:
 *   SELECT Demo records WHERE approved=false
 *   AND createdAt < NOW() - INTERVAL '1 hour'
 *   AND lead.status = 'demo_scheduled'
 *
 * For each matching lead:
 *   1. Initialize a Paystack transaction via the internal init route
 *   2. Enqueue a WhatsApp nudge job with the payment link
 *
 * Protected by CRON_SECRET Bearer token auth.
 */
export async function GET(req: Request) {
  // Auth check
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  const expected = "Bearer " + secret;

  if (!secret || authHeader !== expected) {
    console.log("[NudgeCron] Auth failure");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results: {
    processed: number;
    skipped: number;
    errors: number;
    details: Array<{ leadId: string; status: string; reason?: string }>;
  } = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    // 1. Query unapproved demos older than 1 hour with demo_scheduled leads
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pendingDemos = await prisma.demo.findMany({
      where: {
        approved: false,
        createdAt: { lt: oneHourAgo },
        lead: { status: "demo_scheduled" },
      },
      include: {
        lead: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            paymentRef: true,
            metadata: true,
          },
        },
      },
    });

    console.log(
      `[NudgeCron] Found ${pendingDemos.length} pending demos older than 1 hour`
    );

    // 2. For each pending demo, initialize payment and enqueue nudge
    for (const demo of pendingDemos) {
      const lead = demo.lead;

      try {
        // Skip if already has a payment reference (already nudged)
        if (lead.paymentRef) {
          results.skipped++;
          results.details.push({
            leadId: lead.id,
            status: "skipped",
            reason: "already_has_payment_ref",
          });
          continue;
        }

        // Determine tier from demo config
        const config = (demo.config ?? {}) as Record<string, unknown>;
        const tier = (config.tier as string) ?? "starter";
        const amounts: Record<string, number> = {
          starter: 149_00,
          pro: 349_00,
          enterprise: 599_00,
        };
        const amountKobo = amounts[tier] ?? 149_00;

        // Build email fallback
        const email =
          lead.email ??
          `${lead.phoneNumber?.replace(/[^0-9]/g, "") ?? "unknown"}@shadowspark-demo.com`;

        // 3. Call Paystack initialize
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        const isMockMode =
          !secretKey || secretKey.startsWith("mock") || secretKey === "";

        let authorizationUrl: string;
        let accessCode: string;
        let reference: string;

        if (isMockMode) {
          // Mock mode
          reference = `demo_${lead.id}_${Date.now()}`;
          accessCode = `mock_${lead.id}`;
          authorizationUrl = `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/checkout/success?reference=${reference}`;

          await prisma.payment.create({
            data: {
              amount: amountKobo,
              status: "pending",
              reference,
              leadId: lead.id,
            },
          });

          await prisma.lead.update({
            where: { id: lead.id },
            data: { paymentRef: reference },
          });
        } else {
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
                  leadId: lead.id,
                  demoSlug: demo.slug,
                  tier,
                  custom_fields: [
                    {
                      display_name: "Lead ID",
                      variable_name: "leadId",
                      value: lead.id,
                    },
                    {
                      display_name: "Demo Slug",
                      variable_name: "demoSlug",
                      value: demo.slug,
                    },
                  ],
                },
                channels: ["card", "bank_transfer", "ussd", "mobile_money"],
                callback_url: `${
                  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
                }/checkout/success`,
              }),
            }
          );

          const data = await paystackResponse.json();

          if (!data.status) {
            throw new Error(data.message ?? "Paystack initialization failed");
          }

          reference = data.data.reference;
          accessCode = data.data.access_code;
          authorizationUrl = data.data.authorization_url;

          // Save reference on lead
          await prisma.lead.update({
            where: { id: lead.id },
            data: { paymentRef: reference },
          });

          // Create pending Payment record
          await prisma.payment.create({
            data: {
              amount: amountKobo,
              status: "pending",
              reference,
              leadId: lead.id,
            },
          });
        }

        // 4. Enqueue WhatsApp nudge
        const phoneNumber = lead.phoneNumber;
        if (phoneNumber) {
          await enqueuePaymentNudge({
            leadId: lead.id,
            phoneNumber,
            authorizationUrl,
            accessCode,
            reference,
            amountKobo,
            tier,
          });
        } else {
          console.warn(
            `[NudgeCron] Lead ${lead.id} has no phoneNumber, skipping WhatsApp nudge`
          );
        }

        results.processed++;
        results.details.push({
          leadId: lead.id,
          status: "processed",
        });
      } catch (error) {
        console.error(
          `[NudgeCron] Failed to process lead ${lead.id}:`,
          error
        );
        results.errors++;
        results.details.push({
          leadId: lead.id,
          status: "error",
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    console.error("[NudgeCron] Fatal error:", error);
    return NextResponse.json(
      { error: "Cron job failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ...results,
  });
}

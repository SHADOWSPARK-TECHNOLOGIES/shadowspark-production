import crypto from "crypto";

import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { LedgerService, type PrismaTransaction } from "@/lib/ledger";

export const runtime = "nodejs";

type PaystackCustomField = {
  variable_name?: string;
  value?: string;
};

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    amount?: number;
    reference?: string;
    metadata?: {
      leadId?: string;
      custom_fields?: PaystackCustomField[];
    };
  };
};

function verifyPaystackSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedDigest = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest();
  const providedDigest = Buffer.from(signature, "hex");

  if (providedDigest.length !== expectedDigest.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

function extractLeadId(payload: PaystackWebhookPayload): string | null {
  if (payload.data?.metadata?.leadId) {
    return payload.data.metadata.leadId;
  }

  const customField = payload.data?.metadata?.custom_fields?.find(
    (field) => field.variable_name === "leadId" && typeof field.value === "string"
  );

  return customField?.value ?? null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    if (!verifyPaystackSignature(payload, signature, secret)) {
      await prisma.systemEvent.create({
        data: {
          type: "SUSPICIOUS_INGRESS",
          message: "Invalid Paystack signature detected",
          metadata: {
            ip: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent") || "unknown",
          },
        },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload) as PaystackWebhookPayload;
    const reference = event.data?.reference;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const existingEvent = await prisma.systemEvent.findFirst({
      where: {
        metadata: {
          path: ["reference"],
          equals: reference,
        },
      },
    });

    if (existingEvent) {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      select: { leadId: true },
    });

    const leadId = extractLeadId(event) ?? payment?.leadId ?? null;
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    const amount = typeof event.data?.amount === "number" ? event.data.amount : 0;
    // Paystack sends amount in kobo already
    const amountInKobo = BigInt(amount);
    const systemEventMetadata: Prisma.InputJsonObject = {
      leadId,
      reference,
      amount,
      event: event.event ?? "charge.success",
    };

    // Interactive transaction: payment + lead + event + settlement ledger entry
    await prisma.$transaction(async (tx) => {
      // 1. Upsert payment record
      await tx.payment.upsert({
        where: { reference },
        update: {
          amount,
          status: "success",
        },
        create: {
          leadId,
          reference,
          amount,
          status: "success",
        },
      });

      // 2. Promote lead tier
      await tx.lead.update({
        where: { id: leadId },
        data: {
          tier: "SEMANTIC_GROWTH",
        },
      });

      // 3. Log the payment event
      await tx.systemEvent.create({
        data: {
          type: "payment_received",
          message: `Payment received for ${reference}`,
          metadata: systemEventMetadata,
        },
      });

      // —— SETTLEMENT BRIDGE ——
      // 4. Create and post a ledger transaction using the new debit/credit schema:
      //    Debit  Corporate Settlement (1111...)  — cash leaves settlement
      //    Credit Platform Revenue     (3333...)  — revenue earned
      await LedgerService.postTransaction(
        {
          userId: leadId,
          reference: `STL-${reference}`,
          idempotencyKey: `settlement-${reference}`,
          description: `Paystack settlement: ${reference}`,
          entries: [
            {
              accountId: "11111111-1111-1111-1111-111111111111", // Corporate Settlement (WALLET)
              debit: amountInKobo, // Debit: cash leaves settlement
              credit: BigInt(0),
            },
            {
              accountId: "33333333-3333-3333-3333-333333333333", // Platform Revenue (INCOME)
              debit: BigInt(0),
              credit: amountInKobo, // Credit: revenue earned
            },
          ],
        },
        tx as unknown as PrismaTransaction // Pass the transaction client for atomicity
      );
    });

    return NextResponse.json({ received: true, success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

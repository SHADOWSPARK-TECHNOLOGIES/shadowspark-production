import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { approvePayment } from "@/lib/payment-approval";

/**
 * POST /api/operator/force-approve-payment/[leadId]
 *
 * Admin-only endpoint that replicates the Paystack webhook's charge.success
 * logic. Used when a lead sends a bank transfer screenshot and the operator
 * manually verifies payment.
 *
 * Flow:
 *   1. Auth check (admin only)
 *   2. Validate lead exists with a pending paymentRef
 *   3. Call approvePayment() — same code path as the webhook
 *   4. Return updated lead
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await params;

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    // 1. Find the lead and its pending payment
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { payments: true, demo: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Find the pending payment — prefer the one matching paymentRef, else latest pending
    const pendingPayment = lead.paymentRef
      ? lead.payments.find((p) => p.reference === lead.paymentRef && p.status === "pending")
      : lead.payments.find((p) => p.status === "pending");

    if (!pendingPayment) {
      return NextResponse.json(
        {
          error: "No pending payment found for this lead",
          paymentRef: lead.paymentRef,
          payments: lead.payments.map((p) => ({ reference: p.reference, status: p.status })),
        },
        { status: 400 }
      );
    }

    // 3. Determine tier from demo config
    const config = (lead.demo?.config ?? {}) as Record<string, unknown>;
    const tier = (config.tier as string) ?? "starter";

    // 4. Execute the same approval logic as the Paystack webhook
    const result = await approvePayment(
      leadId,
      pendingPayment.reference,
      pendingPayment.amount,
      tier,
      "operator_force_approve"
    );

    // 5. Fetch updated lead for response
    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { demo: true, payments: true },
    });

    return NextResponse.json({
      ok: true,
      note: result.note ?? "payment_approved",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("[ForceApprovePayment] Error:", error);
    return NextResponse.json(
      { error: "Force approval failed" },
      { status: 500 }
    );
  }
}

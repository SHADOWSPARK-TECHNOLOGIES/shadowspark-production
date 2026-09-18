import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, amount, leadId, metadata } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Ensure a valid Lead record exists to satisfy foreign key constraint
    let lead = leadId && leadId !== "new"
      ? await prisma.lead.findUnique({ where: { id: leadId } })
      : null;

    if (!lead && email) {
      lead = await prisma.lead.findFirst({ where: { email } });
    }

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          email,
          status: "NEW",
          intent: "DIRECT_CHECKOUT",
          miniAuditData: metadata || {},
        },
      });
    }

    const targetLeadId = lead.id;
    
    // Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        amount,
        status: "pending",
        reference: `pay_${targetLeadId}_${Date.now()}`,
        leadId: targetLeadId,
      },
    });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // If no real Paystack key, return a mock URL for development
    if (!secretKey || secretKey.startsWith("mock") || secretKey === "") {
      const mockUrl = `/checkout/success?reference=${payment.reference}`;
      
      // Update lead immediately in mock mode
      await prisma.lead.update({
        where: { id: targetLeadId },
        data: { paymentRef: payment.reference }
      });
      
      return NextResponse.json({ 
        status: true,
        data: { authorization_url: mockUrl, reference: payment.reference } 
      });
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount, // Amount is already provided in kobo by checkout clients.
        callback_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/success`,
        metadata: {
          custom_fields: [
            {
              display_name: "Lead ID",
              variable_name: "leadId",
              value: targetLeadId,
            }
          ]
        },
      }),
    });

    const data = await paystackResponse.json();
    
    if (data.status) {
      // Update payment with the real Paystack reference
      await prisma.payment.update({
        where: { id: payment.id },
        data: { reference: data.data.reference }
      });
      
      await prisma.lead.update({
        where: { id: targetLeadId },
        data: { paymentRef: data.data.reference }
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Paystack] Init Error:", error);
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 });
  }
}

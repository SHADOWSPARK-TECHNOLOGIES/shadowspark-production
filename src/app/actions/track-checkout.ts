"use server";

import { prisma } from "@/lib/prisma";

export async function trackCheckoutView(leadId: string) {
  try {
    await prisma.systemEvent.create({
      data: {
        type: "CHECKOUT_VIEWED",
        message: `Checkout viewed by lead ${leadId}`,
        metadata: { leadId, timestamp: new Date().toISOString() }
      }
    });
    return { success: true };
  } catch (error) {
    console.error("[TRACKING ERROR] Failed to log checkout view:", error);
    return { success: false, error };
  }
}

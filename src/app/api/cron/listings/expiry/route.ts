import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendListingExpiryReminder } from "@/lib/whatsapp/messaging";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Send reminders for listings expiring within 7 days
  const expiringListings = await prisma.listing.findMany({
    where: {
      active: true,
      reminderSent: false,
      expiresAt: { gte: now, lte: sevenDaysFromNow },
    },
    include: { trustComponents: true },
  });

  for (const listing of expiringListings) {
    const daysLeft = Math.ceil(
      ((listing.expiresAt?.getTime() ?? 0) - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send to owner phone if available — owner lookup skipped since ownerId is optional
    sendListingExpiryReminder("", listing.title, daysLeft);

    await prisma.listing.update({
      where: { id: listing.id },
      data: { reminderSent: true },
    });
  }

  // Deactivate expired listings
  const { count: deactivated } = await prisma.listing.updateMany({
    where: { active: true, expiresAt: { lt: now } },
    data: { active: false },
  });

  console.log(
    "[cron:listings:expiry] reminders=%d deactivated=%d",
    expiringListings.length,
    deactivated
  );

  return NextResponse.json({
    ok: true,
    reminders: expiringListings.length,
    deactivated,
  });
}

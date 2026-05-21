import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Storage } from "@google-cloud/storage";

export const runtime = "nodejs";

const BUCKET_NAME = "shadowspark-genesis-backups-2026";

async function sendSlackStatus(success: boolean, message: string) {
  const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
  if (SLACK_WEBHOOK) {
    try {
      await fetch(SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: (success ? "✅" : "❌") + " *Database Backup:* " + message
        })
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Failed to send Slack status:", message);
    }
  }
}

export async function GET(req: Request) {
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret || authHeader !== ("Bearer " + secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("Starting backup database query...");
    const storage = new Storage();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const leads = await prisma.lead.findMany();
    const users = await prisma.user.findMany();
    const payments = await prisma.payment.findMany();

    const backupData = JSON.stringify({ leads, users, payments }, null, 2);
    const fileName = "backups/db-backup-" + timestamp + ".json";

    await storage.bucket(BUCKET_NAME).file(fileName).save(backupData);

    await sendSlackStatus(true, "Successfully backed up " + leads.length + " leads, " + users.length + " users, and " + payments.length + " payments to GCS.");

    return NextResponse.json({ 
      success: true, 
      file: fileName,
      stats: { leads: leads.length, users: users.length, payments: payments.length }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Backup error detail:", message);
    await sendSlackStatus(false, "Backup failed: " + message);
    return NextResponse.json({ error: "Backup failed", details: message }, { status: 500 });
  }
}

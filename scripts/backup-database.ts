import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import axios from "axios";

const prisma = new PrismaClient();
const storage = new Storage();
const bucketName = "shadowspark-genesis-backups-2026";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function sendSlackStatus(success: boolean, message: string) {
  if (SLACK_WEBHOOK) {
    await axios.post(SLACK_WEBHOOK, {
      text: `${success ? "✅" : "❌"} *Database Backup:* ${message}`
    });
  }
}

async function runBackup() {
  console.log("Starting logical database backup...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  try {
    const leads = await prisma.lead.findMany();
    const users = await prisma.user.findMany();
    const payments = await prisma.payment.findMany();

    const backupData = JSON.stringify({ leads, users, payments }, null, 2);
    const fileName = `backups/db-backup-${timestamp}.json`;

    await storage.bucket(bucketName).file(fileName).save(backupData);
    
    console.log(`Backup saved to gs://${bucketName}/${fileName}`);
    await sendSlackStatus(true, `Successfully backed up ${leads.length} leads, ${users.length} users, and ${payments.length} payments to GCS.`);
  } catch (error: any) {
    console.error("Backup failed:", error.message);
    await sendSlackStatus(false, `Backup failed: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();

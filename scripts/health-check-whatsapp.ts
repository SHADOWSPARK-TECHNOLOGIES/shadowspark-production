import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const BUSINESS_ID = "1416205687214106";
const WEBHOOK_URL = "https://shadowspark-chatbot-524469712746.europe-central2.run.app/webhooks/whatsapp";
const VERIFY_TOKEN = "ShadowSpark_2026_Final";

async function sendSlackAlert(message: string) {
  console.log(`Alert: ${message}`);
  if (SLACK_WEBHOOK) {
    try {
      await axios.post(SLACK_WEBHOOK, { 
        text: `🚨 *WhatsApp Bot Health Alert*\n*Status:* FAILED\n*Detail:* ${message}\n*Project:* shadowspark-production-489115` 
      });
    } catch (e: any) {
      console.error("Failed to send Slack alert:", e.message);
    }
  }
}

async function runHealthCheck() {
  const status: any = {
    timestamp: new Date().toISOString(),
    webhook: "unknown",
    database: "unknown",
    meta_api: "unknown"
  };

  // 1. Webhook Challenge
  try {
    const res = await axios.get(`${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=health_check`);
    if (res.data === "health_check") {
      status.webhook = "ok";
    } else {
      status.webhook = "failed";
      await sendSlackAlert("Webhook returned unexpected challenge response.");
    }
  } catch (error: any) {
    status.webhook = "error";
    await sendSlackAlert(`Webhook Unreachable: ${error.message}`);
  }

  // 2. Database Connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "ok";
  } catch (error: any) {
    status.database = "error";
    await sendSlackAlert(`Database Connection Failed: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 3. Meta API Token Validity
  if (META_TOKEN) {
    try {
      const res = await axios.get(`https://graph.facebook.com/v21.0/${BUSINESS_ID}`, {
        params: { access_token: META_TOKEN, fields: "name,status" }
      });
      status.meta_api = "ok";
    } catch (error: any) {
      status.meta_api = "error";
      const msg = error.response?.data?.error?.message || error.message;
      await sendSlackAlert(`Meta Token Issue: ${msg}`);
    }
  }

  console.log(JSON.stringify(status, null, 2));
}

runHealthCheck();

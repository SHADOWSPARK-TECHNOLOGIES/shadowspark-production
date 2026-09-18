import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BUSINESS_ID = "1416205687214106";
const WEBHOOK_URL = "https://shadowspark-chatbot-524469712746.europe-central2.run.app/webhooks/whatsapp";

async function sendSlackAlert(message: string, system: string = "WhatsApp Bot Health Alert") {
  const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
  if (SLACK_WEBHOOK) {
    try {
      await fetch(SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: `🚨 *${system}*\n*Status:* FAILED\n*Detail:* ${message}\n*Project:* shadowspark-production-489115` 
        })
      });
    } catch (e: any) {
      console.error("Failed to send Slack alert:", e.message);
    }
  }
}

export async function GET(req: Request) {
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  const expected = "Bearer " + secret;
  
  if (!secret || authHeader !== expected) {
    console.warn("[cron/health-check] Auth failure: invalid or missing Bearer token");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const status: any = {
    timestamp: new Date().toISOString(),
    webhook: "unknown",
    database: "unknown",
    meta_api: "unknown",
    redis: "unknown"
  };

  // 1. Webhook Challenge: never fall back to a committed credential.
  try {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken?.trim()) {
      throw new Error("WHATSAPP_VERIFY_TOKEN is not configured");
    }
    const webhookUrl = new URL(WEBHOOK_URL);
    webhookUrl.searchParams.set("hub.mode", "subscribe");
    webhookUrl.searchParams.set("hub.verify_token", verifyToken);
    webhookUrl.searchParams.set("hub.challenge", "health_check");
    const res = await fetch(webhookUrl.toString());
    const data = await res.text();
    if (data === "health_check") {
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
  }

  // 3. Meta API Token Validity
  const META_TOKEN = process.env.META_ACCESS_TOKEN;
  if (META_TOKEN) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${BUSINESS_ID}?access_token=${META_TOKEN}&fields=name,status`);
      if (res.ok) {
        status.meta_api = "ok";
      } else {
        const errorData = await res.json();
        status.meta_api = "error";
        await sendSlackAlert(`Meta Token Issue: ${errorData.error?.message || "Unknown API error"}`);
      }
    } catch (error: any) {
      status.meta_api = "error";
      await sendSlackAlert(`Meta Token Issue: ${error.message}`);
    }
  }

  // 4. Redis Capacity
  try {
    const { redis } = await import("@/lib/redis");
    const memoryInfo = await redis.info("memory");
    const usedMatch = memoryInfo.match(/used_memory:(\d+)/);
    const maxMatch = memoryInfo.match(/maxmemory:(\d+)/);
    
    if (usedMatch) {
      const usedMemory = parseInt(usedMatch[1], 10);
      // Upstash free tier max memory defaults to 256MB
      const maxMemory = maxMatch && maxMatch[1] !== "0" ? parseInt(maxMatch[1], 10) : 256 * 1024 * 1024;
      
      const usagePercentage = (usedMemory / maxMemory) * 100;
      
      if (usagePercentage > 80) {
        status.redis = "warning";
        await sendSlackAlert(
          `Redis usage is at ${usagePercentage.toFixed(1)}% (${(usedMemory / 1024 / 1024).toFixed(2)}MB). Approaching Upstash free tier limits!`, 
          "Redis Capacity Alert"
        );
      } else {
        status.redis = "ok";
      }
    }
  } catch (error: any) {
    status.redis = "error";
    await sendSlackAlert(`Redis Connection Failed: ${error.message}`, "Redis Health Alert");
  }

  return NextResponse.json(status);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BUSINESS_ID = "1416205687214106";
const WEBHOOK_URL = "https://shadowspark-chatbot-524469712746.europe-central2.run.app/webhooks/whatsapp";

interface HealthStatus {
  timestamp: string;
  webhook: string;
  database: string;
  meta_api: string;
  redis: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function metaApiError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return "Unknown API error";
}

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
    } catch (error: unknown) {
      console.error("Failed to send Slack alert:", errorMessage(error));
    }
  }
}

export async function GET(req: Request) {
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  const expected = "Bearer " + secret;
  
  if (!secret || authHeader !== expected) {
    console.log("Auth Failure:", { 
      received: authHeader ? "PRESENT" : "MISSING",
      expected: secret ? "PRESENT" : "MISSING",
      secretLength: secret.length 
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const status: HealthStatus = {
    timestamp: new Date().toISOString(),
    webhook: "unknown",
    database: "unknown",
    meta_api: "unknown",
    redis: "unknown"
  };

  // 1. Webhook Challenge
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!verifyToken) {
    status.webhook = "not_configured";
  } else {
    try {
      const healthUrl = new URL(WEBHOOK_URL);
      healthUrl.searchParams.set("hub.mode", "subscribe");
      healthUrl.searchParams.set("hub.verify_token", verifyToken);
      healthUrl.searchParams.set("hub.challenge", "health_check");
      const res = await fetch(healthUrl);
      const data = await res.text();
      if (data === "health_check") {
        status.webhook = "ok";
      } else {
        status.webhook = "failed";
        await sendSlackAlert("Webhook returned unexpected challenge response.");
      }
    } catch (error: unknown) {
      status.webhook = "error";
      await sendSlackAlert(`Webhook Unreachable: ${errorMessage(error)}`);
    }
  }

  // 2. Database Connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "ok";
  } catch (error: unknown) {
    status.database = "error";
    await sendSlackAlert(`Database Connection Failed: ${errorMessage(error)}`);
  }

  // 3. Meta API Token Validity
  const META_TOKEN = process.env.META_ACCESS_TOKEN;
  if (META_TOKEN) {
    try {
      const metaUrl = new URL(`https://graph.facebook.com/v21.0/${BUSINESS_ID}`);
      metaUrl.searchParams.set("fields", "name,status");
      const res = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${META_TOKEN}` },
      });
      if (res.ok) {
        status.meta_api = "ok";
      } else {
        const errorData: unknown = await res.json();
        status.meta_api = "error";
        await sendSlackAlert(`Meta Token Issue: ${metaApiError(errorData)}`);
      }
    } catch (error: unknown) {
      status.meta_api = "error";
      await sendSlackAlert(`Meta Token Issue: ${errorMessage(error)}`);
    }
  }

  // 4. Redis Capacity
  try {
    const { redis } = await import("@/lib/redis");
    if (redis === null) {
      status.redis = "not_configured";
      return NextResponse.json(status);
    }

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
  } catch (error: unknown) {
    status.redis = "error";
    await sendSlackAlert(`Redis Connection Failed: ${errorMessage(error)}`, "Redis Health Alert");
  }

  return NextResponse.json(status);
}

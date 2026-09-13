import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { qualifyLead } from "../lib/leads/qualification";
import type { LeadSyncJobData } from "../lib/leads/queue";
import { z } from "zod";

const ANYTHING_LLM_URL =
  process.env.ANYTHING_LLM_URL ||
  "http://localhost:3001/api/v1/workspace/shadowspark-w/chat";
const LOCAL_LLM_KEY = process.env.LOCAL_LLM_KEY || "";
const leadAnalysisResponseSchema = z
  .object({
    textResponse: z.string().optional(),
    response: z.string().optional(),
  })
  .passthrough();

async function analyzeLeadIntent(
  leadMessage: string,
): Promise<{ score: number; reasoning: string }> {
  if (!leadMessage) return { score: 50, reasoning: "No message provided for analysis." };

  try {
    const prompt = `Analyze this lead message: "${leadMessage}". \nScore it from 0-100 based on conversion intent. \nProvide a short 1-sentence reasoning, then output ONLY the number at the very end.`;

    const response = await fetch(ANYTHING_LLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOCAL_LLM_KEY}`,
      },
      body: JSON.stringify({ message: prompt, mode: "chat" }),
    });

    if (!response.ok) {
      throw new Error(
        `AnythingLLM API responded with status: ${response.status} - ${await response.text()}`,
      );
    }

    const responsePayload: unknown = await response.json();
    const parsedResponse = leadAnalysisResponseSchema.safeParse(responsePayload);
    const rawText = parsedResponse.success
      ? parsedResponse.data.textResponse ??
        parsedResponse.data.response ??
        JSON.stringify(parsedResponse.data)
      : JSON.stringify(responsePayload);

    console.log(`[PIS] Raw AI Output: ${rawText.trim()}`);

    // Extract the numerical score from the response
    const match = rawText.match(/\d+/g);
    const score = match ? parseInt(match[match.length - 1], 10) : 50;

    return {
      score: Math.min(Math.max(score, 0), 100),
      reasoning: rawText.trim().replace(/\n/g, " ").slice(0, 200),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[PIS] Scoring failed (Ensure AnythingLLM is running on port 3001). Error:`,
      message,
    );
    return { score: 50, reasoning: `Scoring failed: ${message}` };
  }
}

async function triggerHighIntentLeadActions(
  leadData: LeadSyncJobData,
  score: number,
): Promise<void> {
  console.log(`\n[HIGH-INTENT] Lead qualified for escalation. Score: ${score}`);
  console.log(
    `[HIGH-INTENT] Routing lead ${leadData.phone || leadData.phoneNumber} to the operator escalation pipeline.\n`,
  );
}

/** Processes one lead synchronization independently of BullMQ transport. */
export async function processLeadSyncJob(data: LeadSyncJobData) {
  // Accommodate both message and lastMessage payload structures.
  const { phone, name, businessType, goals, source, intent, message, lastMessage } = data;
  const leadMessage = message || lastMessage || goals || "";

  console.log(`[SES] Processing lead: ${phone} from ${source}`);

  const analysis = await analyzeLeadIntent(leadMessage);
  const finalScore = Math.max(analysis.score, data.leadScore || 0);

  const miniAuditData = {
    name,
    businessType,
    goals,
    source,
    originalMessage: leadMessage,
    reasoning: analysis.reasoning,
  };
  const lead = await prisma.lead.upsert({
    where: { phoneNumber: phone },
    update: {
      lastMessage: `Sync from ${source || "external chatbot"}`,
      miniAuditData,
      status: "QUALIFIED",
      leadScore: finalScore,
      intent: intent || undefined,
    },
    create: {
      phoneNumber: phone,
      status: "QUALIFIED",
      intent: intent || "SYNC",
      leadScore: finalScore,
      lastMessage: `Initial sync from ${source || "external chatbot"}`,
      miniAuditData,
    },
  });

  const isQualified = qualifyLead(lead);
  if (isQualified || finalScore > 85) {
    await triggerHighIntentLeadActions(data, finalScore);
  }

  return { success: true, leadId: lead.id, score: finalScore };
}

export const leadWorker = redis
  ? new Worker<LeadSyncJobData>(
      "lead-sync-queue",
      async (job) => processLeadSyncJob(job.data),
      { connection: redis }
    )
  : null;

leadWorker?.on("completed", (job, result) => {
  console.log(`[SES] Job ${job.id} completed. Lead Score: ${result?.score}`);
});

leadWorker?.on("failed", (job, err) => {
  console.error(`[SES] Job ${job?.id} failed: ${err.message}`);
});

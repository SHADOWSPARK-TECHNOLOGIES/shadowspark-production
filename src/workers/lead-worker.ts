import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { qualifyLead } from "../lib/leads/qualification";

const WORKER_NAME = "lead-sync-worker";
const ANYTHING_LLM_URL = process.env.ANYTHING_LLM_URL || "http://localhost:3001/api/v1/workspace/shadowspark-w/chat";
const LOCAL_LLM_KEY = process.env.LOCAL_LLM_KEY || "";

async function analyzeLeadIntent(leadMessage: string): Promise<{ score: number, reasoning: string }> {
  if (!leadMessage) return { score: 50, reasoning: "No message provided for analysis." };

  try {
    const prompt = `Analyze this lead message: "${leadMessage}". \nScore it from 0-100 based on conversion intent. \nProvide a short 1-sentence reasoning, then output ONLY the number at the very end.`;

    const response = await fetch(ANYTHING_LLM_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOCAL_LLM_KEY}`
      },
      body: JSON.stringify({ message: prompt, mode: "chat" })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API responded with status: ${response.status} - ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    const rawText = jsonResponse?.textResponse || jsonResponse?.response || JSON.stringify(jsonResponse);
    
    console.log(`[PIS] Raw AI Output: ${rawText.trim()}`);
    
    // Extract the numerical score from the response
    const match = rawText.match(/\d+/g);
    const score = match ? parseInt(match[match.length - 1], 10) : 50; 
    
    return { 
      score: Math.min(Math.max(score, 0), 100), 
      reasoning: rawText.trim().replace(/\n/g, ' ').slice(0, 200) 
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[PIS] Scoring failed (Ensure AnythingLLM is running on port 3001). Error:`, message);
    return { score: 50, reasoning: `Scoring failed: ${message}` };
  }
}

async function triggerApexLeadActions(leadData: any, score: number) {
  console.log(`\n[WARLORD TRIGGER] 🚀 APEX LEAD DETECTED! Score: ${score}`);
  console.log(`[WARLORD TRIGGER] Routing lead ${leadData.phone || leadData.phoneNumber} to immediate operator escalation pipeline.\n`);
  // TODO: Implement actual Slack/WhatsApp webhook
}

export const leadWorker = new Worker(
  "lead-sync-queue",
  async (job) => {
    // Accommodating both 'message' and 'lastMessage' payload structures
    const { phone, name, businessType, goals, source, intent, message, lastMessage } = job.data;
    const leadMessage = message || lastMessage || goals || "";

    console.log(`[SES] Processing lead: ${phone} from ${source}`);

    // 1. PIS (Predictive Intent Scoring) via Local AnythingLLM
    const analysis = await analyzeLeadIntent(leadMessage);
    const finalScore = Math.max(analysis.score, job.data.leadScore || 0); // Respect hardcoded score if higher

    // 2. Perform Database Upsert
    const lead = await prisma.lead.upsert({
      where: { phoneNumber: phone },
      update: {
        lastMessage: `Sync from ${source || "external chatbot"}`,
        miniAuditData: { name, businessType, goals, source, originalMessage: leadMessage, reasoning: analysis.reasoning },
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
        miniAuditData: { name, businessType, goals, source, originalMessage: leadMessage, reasoning: analysis.reasoning },
      },
    });

    // 3. SES Logic: Execute 'Warlord' Trigger if "High-Intent"
    const isQualified = qualifyLead(lead);

    if (isQualified || finalScore > 85) {
      await triggerApexLeadActions(job.data, finalScore);
    }

    return { success: true, leadId: lead.id, score: finalScore };
  },
  { connection: redis }
);

leadWorker.on("completed", (job, result) => {
  console.log(`[SES] Job ${job.id} completed. Lead Score: ${result?.score}`);
});

leadWorker.on("failed", (job, err) => {
  console.error(`[SES] Job ${job?.id} failed: ${err.message}`);
});

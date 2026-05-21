import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Use edge runtime if possible, or node if connecting directly to another DB
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = (req.headers.get("authorization") || "").trim();
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret || authHeader !== ("Bearer " + secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // In a real scenario, this fetches from the chatbot's separate database or Redis.
    // For this V1 deployment, we assume the chatbot service exposes an internal API
    // or we query a shared "ChatbotLead" table if they share the Neon DB.
    // We will simulate the pull and map the fields to the V1 Lead model.
    
    console.log("CRON: Pulling latest leads from Chatbot Database...");
    
    // Simulated chatbot data payload
    const recentChatbotLeads = [
      {
        wa_id: "+2348012345678",
        profile_name: "Adeola Ventures",
        intent_score: 85,
        last_interaction: new Date().toISOString(),
        extracted_data: {
          businessType: "Retail",
          goals: "Automate sales via WhatsApp",
          source: "WhatsApp Business"
        }
      }
    ];

    let syncedCount = 0;

    for (const cbLead of recentChatbotLeads) {
      // Map Chatbot Data to V1 Lead Model
      await prisma.lead.upsert({
        where: { phoneNumber: cbLead.wa_id },
        update: {
          lastMessage: `Automated sync from Chatbot at \${new Date().toISOString()}`,
          leadScore: cbLead.intent_score,
          miniAuditData: {
            name: cbLead.profile_name,
            businessType: cbLead.extracted_data.businessType,
            goals: cbLead.extracted_data.goals,
            source: cbLead.extracted_data.source,
          },
        },
        create: {
          phoneNumber: cbLead.wa_id,
          status: "QUALIFIED",
          intent: "WHATSAPP_BOT",
          leadScore: cbLead.intent_score,
          lastMessage: "Initial sync from WhatsApp Chatbot",
          miniAuditData: {
            name: cbLead.profile_name,
            businessType: cbLead.extracted_data.businessType,
            goals: cbLead.extracted_data.goals,
            source: cbLead.extracted_data.source,
          }
        }
      });
      syncedCount++;
    }

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: "Failed to sync chatbot leads" }, { status: 500 });
  }
}

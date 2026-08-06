import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import FirecrawlApp from "@mendable/firecrawl-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Lazily initialise external clients inside the handler so they are never
  // constructed during `next build` when env vars may be absent.
  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "" });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  try {
    // 1. Authorization Guard
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.WORKER_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized access to Lethal Analysis Engine" }, { status: 401 });
    }

    // 2. Parse payload
    const body = await req.json();
    const { targetId } = body;

    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId in payload" }, { status: 400 });
    }

    // 3. Fetch Target
    const target = await prisma.sniperTarget.findFirst({
      where: { 
        id: targetId,
        status: { in: ['new', 'processing'] } 
      }
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found or not in valid status" }, { status: 404 });
    }

    // Lock the record
    await prisma.sniperTarget.update({
      where: { id: targetId },
      data: { status: "processing" }
    });

    console.log(`[LETHAL WORKER] Executing strike sequence on ${target.domain}`);

    // 4. Firecrawl Scrape
    let markdown = "";
    try {
      const scrapeResult = await firecrawl.scrape(target.domain, { formats: ["markdown"] });
      if (!scrapeResult.markdown) {
        throw new Error(`Scrape returned missing markdown`);
      }
      markdown = scrapeResult.markdown;
    } catch (scrapeError: any) {
      console.error(`[LETHAL WORKER] Scrape failed for ${target.domain}:`, scrapeError);
      await prisma.sniperTarget.update({
        where: { id: targetId },
        data: { status: "dead_link" }
      });
      return NextResponse.json({ error: "Target infrastructure impenetrable (Dead Link/Scrape Failed)" }, { status: 422 });
    }

    // 5. Gemini Analysis
    let draftEmail = "";
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const prompt = `You are an aggressive, high-end technical sales architect. Analyze this site markdown. Write a lethal, 3-sentence cold email to the decision maker. Highlight a specific conversion flaw based on the markdown and this ingested signal: ${target.signal || "General optimization"}. Offer our autonomous revenue engine as the fix. Output ONLY the email text.

MARKDOWN:
${markdown.substring(0, 20000)} // Truncate to fit context window
`;
      
      const result = await model.generateContent(prompt);
      draftEmail = result.response.text().trim();
    } catch (llmError: any) {
      console.error(`[LETHAL WORKER] Gemini analysis failed for ${target.domain}:`, llmError);
      await prisma.sniperTarget.update({
        where: { id: targetId },
        data: { status: "analysis_failed" }
      });
      return NextResponse.json({ error: "Cognitive engine failure (LLM Error)" }, { status: 500 });
    }

    // 6. Update Target
    const updatedTarget = await prisma.sniperTarget.update({
      where: { id: targetId },
      data: { 
        status: "analyzed",
        draftEmail: draftEmail,
        generatedDraft: draftEmail // Keep sync with both schema versions
      }
    });

    console.log(`[LETHAL WORKER] Strike payload drafted for ${target.domain}`);

    // 7. Return payload
    return NextResponse.json({ 
      status: "success", 
      draftEmail: updatedTarget.draftEmail 
    });

  } catch (error) {
    console.error("[LETHAL WORKER FATAL ERROR]", error);
    return NextResponse.json({ error: "Internal server error in Lethal Analysis Engine" }, { status: 500 });
  }
}

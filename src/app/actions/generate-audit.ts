"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function generateAuditAction(data: { businessType: string; goals: string; features: string[] }) {
  const prompt = `
    You are ShadowSpark's audit engine. 
    Analyze this business:
    Type: ${data.businessType}
    Goals: ${data.goals}
    Desired Features: ${data.features.join(", ")}

    Recommend one of our packages: Launch, Growth, or Automation.
    Provide 3-4 specific, actionable bullet points tailored to this industry to optimize their operations using AI and high-performance web systems.
    
    Output strictly as JSON in this format:
    {
      "recommendedPackage": "Package Name",
      "headline": "Personalized Headline",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Audit failed:", error);
    return {
      recommendedPackage: "Growth",
      headline: `Precision Architecture for ${data.businessType}`,
      bullets: [
        "Automate initial lead qualification on WhatsApp.",
        "Implement a custom dashboard to track conversion metrics.",
        "Deploy 24/7 AI support nodes for sovereign operations."
      ]
    };
  }
}

// app/api/chat/route.ts
// ShadowSpark site chatbot — Claude-powered, runs as a Vercel serverless function.
// Requires env var: ANTHROPIC_API_KEY  (add via `vercel env add ANTHROPIC_API_KEY production`)

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // fast cold starts; remove if you prefer Node runtime

// ── Knowledge base: edit this to change what the bot knows about ShadowSpark ──
const SYSTEM_PROMPT = `You are the ShadowSpark Technologies assistant — a friendly, concise guide on the company website. Your job is to explain ShadowSpark's services and expertise to visitors and help them figure out if ShadowSpark is a fit for their project.

ABOUT SHADOWSPARK:
ShadowSpark Technologies is a software architecture and engineering studio based in Port Harcourt, Nigeria, building production-grade AI systems, fintech infrastructure, and cloud-native platforms for the African market and beyond.

SERVICES & EXPERTISE:
- AI Agent Systems: Autonomous multi-agent pipelines using Claude, Gemini, and custom LLM orchestration — chatbots through to fully agentic task runners with tool use, memory, and context management.
- Cloud Architecture: Production infrastructure on AWS (ECR, App Runner, Bedrock), GCP, and Vercel. Containerised microservices, CI/CD pipelines, multi-cloud strategies.
- Fintech Engineering: Multi-tenant payment systems, wallet infrastructure, Paystack integration, fraud detection, regulatory-compliant platforms for the Nigerian and African fintech market.
- Full-Stack Web Apps: Next.js, TypeScript, Prisma ORM, Neon PostgreSQL, server components, RBAC auth, real-time features, mobile-first UIs.
- PropTech Platforms: AI-powered rental and property platforms. Built Lodgist — an end-to-end listing, booking, and tenant management system with AI-driven search and matching.
- Security & Fraud Systems: Trust systems, fraud detection pipelines, device fingerprinting, rate limiting, security auditing.

FLAGSHIP PROJECT — LODGIST:
An AI-powered rental platform for the Nigerian market. Landlords list properties; tenants discover, book, and manage rentals end-to-end. Built with AI search, geo-based matching, Paystack payments, fraud detection, and multi-tenant RBAC. Designed to solve Africa's informal rental market.

HOW SHADOWSPARK WORKS:
1. Discover — deep problem analysis, mapping data flows and security boundaries.
2. Design — schema design, API contracts, microservice boundaries, cloud topology.
3. Build — rapid AI-assisted implementation, containerised, with CI/CD.
4. Deploy & Harden — zero-downtime deploys, monitoring, rate limiting, fraud detection, security hardening.

CONTACT:
- Email: hello@shadowspark.tech
- Location: Port Harcourt, Nigeria · Remote-friendly
- For project inquiries, direct people to the contact form on the site.

RULES:
- Keep answers short and conversational (2-4 sentences unless asked for detail).
- Only discuss ShadowSpark, its services, Lodgist, and how to start a project.
- If asked something off-topic or that you don't know, politely steer back to ShadowSpark and suggest the contact form for specifics.
- Never invent pricing, timelines, or commitments. If asked about cost or timeline, say it depends on scope and invite them to reach out via the contact form.
- Be warm and professional. You represent the company.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Trim history to last 10 turns to control token cost
    const trimmed = messages.slice(-10);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json(
        { error: "Upstream error" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply =
      data.content
        ?.filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("\n") ?? "Sorry, I didn't catch that — could you rephrase?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

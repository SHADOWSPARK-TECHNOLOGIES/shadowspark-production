// app/api/chat/route.ts
// ShadowSpark site chatbot — Claude-powered, runs as a Vercel serverless function.
// Requires env var: ANTHROPIC_API_KEY  (add via `vercel env add ANTHROPIC_API_KEY production`)

import { NextRequest, NextResponse } from "next/server";

import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";

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

function isChatMessage(value: unknown): value is ChatMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "role" in value &&
      "content" in value &&
      (value as { role?: unknown }).role !== undefined &&
      ((value as { role?: unknown }).role === "user" ||
        (value as { role?: unknown }).role === "assistant") &&
      typeof (value as { content?: unknown }).content === "string" &&
      (value as { content: string }).content.trim() !== ""
  );
}

function extractOpenAICompatibleContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        "text" in part &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

async function createOpenAICompatibleReply(messages: ChatMessage[]) {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return null;
  }

  const baseUrl =
    optionalEnv("DEEPSEEK_BASE_URL") ??
    "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = optionalEnv("CHAT_MODEL") ?? "gemini-2.5-flash";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ["Bearer", apiKey].join(" "),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return {
      ok: false as const,
      status: response.status,
      error: details || "OpenAI-compatible upstream error",
    };
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const reply = extractOpenAICompatibleContent(data.choices?.[0]?.message?.content);

  return {
    ok: true as const,
    reply: reply || "Sorry, I didn't catch that — could you rephrase?",
  };
}

async function createAnthropicReply(messages: ChatMessage[]) {
  const apiKey = optionalEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return null;
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
      messages,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return {
      ok: false as const,
      status: response.status,
      error: details || "Anthropic upstream error",
    };
  }

  const data = await response.json() as {
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
  const reply =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n") ?? "Sorry, I didn't catch that — could you rephrase?";

  return {
    ok: true as const,
    reply,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages?: unknown;
    };
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isChatMessage)
      : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Trim history to last 10 turns to control token cost
    const trimmed = messages.slice(-10);
    const result =
      (await createOpenAICompatibleReply(trimmed)) ??
      (await createAnthropicReply(trimmed));

    if (!result) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    if (!result.ok) {
      console.error("[api][chat] upstream error", result.status);
      return NextResponse.json(
        { error: "Upstream error", details: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ content: result.reply, reply: result.reply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

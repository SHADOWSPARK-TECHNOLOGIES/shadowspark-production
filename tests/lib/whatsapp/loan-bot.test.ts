/**
 * Tests for the loan bot state machine.
 *
 * Redis and Prisma are mocked so these run without infrastructure.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock redis ────────────────────────────────────────────────────────────────

const redisStore: Record<string, string> = {};
vi.mock("@/lib/redis", () => ({
  redis: {
    get: async (key: string) => redisStore[key] ?? null,
    set: async (key: string, value: string) => { redisStore[key] = value; },
    del: async (key: string) => { delete redisStore[key]; },
  },
}));

// ── Mock prisma ───────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loanApplication: {
      create: async (args: { data: Record<string, unknown> }) => ({
        id: "test-loan-id-123456789",
        ...args.data,
      }),
    },
  },
}));

// ── Mock loan-messaging ───────────────────────────────────────────────────────

vi.mock("@/lib/whatsapp/loan-messaging", () => ({
  sendLoanBotMessage: async () => ({ success: true, messageSid: "SM_test" }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

async function getProcessor() {
  const mod = await import("@/lib/whatsapp/loan-bot");
  return mod.processLoanBotMessage;
}

const FROM = "whatsapp:+2348012345678";

function msg(body: string, mediaUrl?: string) {
  return { from: FROM, body, mediaUrl };
}

describe("Loan Bot — state machine transitions", () => {
  beforeEach(() => {
    // Clear in-memory redis store between tests
    for (const key of Object.keys(redisStore)) {
      delete redisStore[key];
    }
    vi.resetModules();
  });

  it("GREETING: responds with welcome and moves to NAME", async () => {
    const process = await getProcessor();
    const reply = await process(msg("hello"));
    expect(reply).toContain("Welcome to *ShadowSpark Loans*");
  });

  it("NAME: stores name and asks for phone", async () => {
    const process = await getProcessor();
    await process(msg("hello")); // greeting → NAME
    const reply = await process(msg("John Doe"));
    expect(reply).toContain("John Doe");
    expect(reply).toContain("phone number");
  });

  it("NAME: rejects names shorter than 3 chars", async () => {
    const process = await getProcessor();
    await process(msg("hello")); // greeting → NAME
    const reply = await process(msg("AB"));
    expect(reply).toContain("full legal name");
  });

  it("PHONE: accepts valid Nigerian phone and asks for amount", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("John Doe"));
    const reply = await process(msg("08012345678"));
    expect(reply).toContain("borrow");
  });

  it("PHONE: rejects invalid phone numbers", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("John Doe"));
    const reply = await process(msg("not-a-phone"));
    expect(reply).toContain("valid Nigerian phone");
  });

  it("AMOUNT: accepts numeric amount and asks for purpose", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("John Doe"));
    await process(msg("08012345678"));
    const reply = await process(msg("50000"));
    expect(reply).toContain("purpose");
  });

  it("AMOUNT: rejects zero or text amounts", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("John Doe"));
    await process(msg("08012345678"));
    const reply = await process(msg("abc"));
    expect(reply).toContain("valid amount");
  });

  it("RESTART: resets session from any step", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("John Doe")); // in NAME step
    const reply = await process(msg("RESTART"));
    expect(reply).toContain("Welcome to *ShadowSpark Loans*");
  });

  it("full happy path reaches COMPLETE with application id", async () => {
    const process = await getProcessor();
    await process(msg("hello"));
    await process(msg("Jane Okafor"));
    await process(msg("+2348012345678"));
    await process(msg("₦200,000"));
    await process(msg("Business expansion"));
    await process(msg("22345678901")); // BVN
    await process(msg("", "https://example.com/id.jpg")); // ID doc
    const reply = await process(msg("", "https://example.com/stmt.pdf")); // Statement
    expect(reply).toContain("submitted successfully");
  });
});

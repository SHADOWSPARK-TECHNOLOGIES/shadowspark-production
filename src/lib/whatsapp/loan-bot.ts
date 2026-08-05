/**
 * WhatsApp Loan Intake Bot — Stateful Conversation Machine
 *
 * Conversation steps:
 *   GREETING → NAME → PHONE → AMOUNT → PURPOSE → BVN → DOCS_ID → DOCS_STATEMENT → COMPLETE
 *
 * State is persisted in Redis keyed by the sender's WhatsApp number so the
 * conversation survives across multiple webhook calls.
 *
 * Twilio signature validation is handled in the webhook route itself.
 */

import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sendLoanBotMessage } from "@/lib/whatsapp/loan-messaging";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BotStep =
  | "GREETING"
  | "NAME"
  | "PHONE"
  | "AMOUNT"
  | "PURPOSE"
  | "BVN"
  | "DOCS_ID"
  | "DOCS_STATEMENT"
  | "COMPLETE";

export interface BotSession {
  step: BotStep;
  applicationId?: string;
  name?: string;
  phone?: string;
  amountRaw?: string;
  purpose?: string;
  bvn?: string;
  idDocUrl?: string;
  statementDocUrl?: string;
}

export interface IncomingMessage {
  /** Sender's WhatsApp number, e.g. "whatsapp:+2348012345678" */
  from: string;
  /** Plain text body of the message */
  body: string;
  /** Media URL if the user sent a document/image */
  mediaUrl?: string;
  /** Twilio MediaContentType */
  mediaContentType?: string;
}

// ── Redis helpers ─────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 60 * 60 * 4; // 4 hours
const sessionKey = (from: string) => `loan-bot:${from}`;

async function getSession(from: string): Promise<BotSession> {
  const raw = await redis.get(sessionKey(from));
  if (raw) {
    try {
      return JSON.parse(raw as string) as BotSession;
    } catch {
      // Corrupted — restart
    }
  }
  return { step: "GREETING" };
}

async function saveSession(from: string, session: BotSession): Promise<void> {
  await redis.set(sessionKey(from), JSON.stringify(session), "EX", SESSION_TTL_SECONDS);
}

async function clearSession(from: string): Promise<void> {
  await redis.del(sessionKey(from));
}

// ── Amount parser ─────────────────────────────────────────────────────────────

function parseAmountToKobo(raw: string): bigint | null {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return BigInt(Math.round(num * 100));
}

// ── State machine ─────────────────────────────────────────────────────────────

/**
 * Process one incoming WhatsApp message and advance the loan bot state.
 * Returns the reply text to send back (or null to suppress a reply).
 */
export async function processLoanBotMessage(msg: IncomingMessage): Promise<string | null> {
  const session = await getSession(msg.from);
  const text = msg.body.trim();

  // Allow "RESTART" at any point
  if (text.toUpperCase() === "RESTART") {
    await clearSession(msg.from);
    return handleStep({ step: "GREETING" }, msg, msg.from);
  }

  return handleStep(session, msg, msg.from);
}

async function handleStep(
  session: BotSession,
  msg: IncomingMessage,
  from: string
): Promise<string | null> {
  const text = msg.body.trim();

  switch (session.step) {
    // ── GREETING ──────────────────────────────────────────────────────────
    case "GREETING": {
      const next: BotSession = { step: "NAME" };
      await saveSession(from, next);
      return (
        "👋 Welcome to *ShadowSpark Loans*!\n\n" +
        "I'll guide you through a quick loan application.\n\n" +
        "Please reply with your *full name* to get started.\n\n" +
        "_Type RESTART at any time to start over._"
      );
    }

    // ── NAME ──────────────────────────────────────────────────────────────
    case "NAME": {
      if (text.length < 3) {
        return "Please enter your full legal name (at least 3 characters).";
      }
      const next: BotSession = { ...session, step: "PHONE", name: text };
      await saveSession(from, next);
      return (
        `Great, *${text}*! 👍\n\n` +
        "What is your *phone number* (Nigerian format, e.g. 08012345678)?"
      );
    }

    // ── PHONE ─────────────────────────────────────────────────────────────
    case "PHONE": {
      const phone = text.replace(/\s+/g, "");
      if (!/^(0|\+234)[789]\d{9}$/.test(phone)) {
        return "Please enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).";
      }
      const next: BotSession = { ...session, step: "AMOUNT", phone };
      await saveSession(from, next);
      return "How much would you like to borrow? (e.g. *50000* or *₦500,000*)";
    }

    // ── AMOUNT ────────────────────────────────────────────────────────────
    case "AMOUNT": {
      const kobo = parseAmountToKobo(text);
      if (kobo === null) {
        return "Please enter a valid amount (numbers only, e.g. *50000*).";
      }
      const next: BotSession = { ...session, step: "PURPOSE", amountRaw: text };
      await saveSession(from, next);
      return (
        "What is the *purpose* of this loan?\n\n" +
        "Examples: Business capital, Medical expenses, Education fees, Home renovation"
      );
    }

    // ── PURPOSE ───────────────────────────────────────────────────────────
    case "PURPOSE": {
      if (text.length < 5) {
        return "Please describe the purpose of the loan in a few words.";
      }
      const next: BotSession = { ...session, step: "BVN", purpose: text };
      await saveSession(from, next);
      return (
        "For KYC verification, please enter your *BVN* (Bank Verification Number).\n\n" +
        "_Your BVN is 11 digits. You can find it by dialling *565*0# on your registered phone._"
      );
    }

    // ── BVN ───────────────────────────────────────────────────────────────
    case "BVN": {
      if (!/^\d{11}$/.test(text)) {
        return "Invalid BVN. Please enter your 11-digit Bank Verification Number.";
      }
      const next: BotSession = { ...session, step: "DOCS_ID", bvn: text };
      await saveSession(from, next);
      return (
        "✅ BVN received.\n\n" +
        "Please send a *photo or scan* of your *government-issued ID* (NIN slip, National ID, Driver's Licence, or International Passport)."
      );
    }

    // ── DOCS_ID ───────────────────────────────────────────────────────────
    case "DOCS_ID": {
      const docUrl = msg.mediaUrl ?? text;
      if (!msg.mediaUrl && !text.startsWith("http")) {
        return "Please send your ID as an *image or PDF attachment*.";
      }
      const next: BotSession = { ...session, step: "DOCS_STATEMENT", idDocUrl: docUrl };
      await saveSession(from, next);
      return (
        "✅ ID document received.\n\n" +
        "Now please send your *6-month bank statement* (PDF or image)."
      );
    }

    // ── DOCS_STATEMENT ────────────────────────────────────────────────────
    case "DOCS_STATEMENT": {
      const docUrl = msg.mediaUrl ?? text;
      if (!msg.mediaUrl && !text.startsWith("http")) {
        return "Please send your bank statement as an *image or PDF attachment*.";
      }

      const next: BotSession = { ...session, step: "COMPLETE", statementDocUrl: docUrl };

      // Parse amount to kobo for storage
      const amountKobo = parseAmountToKobo(session.amountRaw ?? "0") ?? BigInt(0);

      // Persist the application
      const application = await prisma.loanApplication.create({
        data: {
          applicantName: session.name!,
          phoneNumber: session.phone!,
          loanAmountKobo: amountKobo,
          purpose: session.purpose!,
          status: "PENDING",
          botSessionId: from,
          kycRecord: {
            create: {
              bvnNumber: session.bvn!,
              status: "PENDING",
            },
          },
          documents: {
            createMany: {
              data: [
                { docType: "NATIONAL_ID", fileUrl: session.idDocUrl! },
                { docType: "BANK_STATEMENT", fileUrl: docUrl },
              ],
            },
          },
        },
      });

      next.applicationId = application.id;
      await saveSession(from, next);

      return (
        "🎉 *Application submitted successfully!*\n\n" +
        `Reference: *${application.id.slice(-8).toUpperCase()}*\n\n` +
        "Our team will review your application and contact you within *24 hours*.\n\n" +
        "Thank you for choosing ShadowSpark Loans! 🚀\n\n" +
        "_Type RESTART to submit another application._"
      );
    }

    // ── COMPLETE ─────────────────────────────────────────────────────────
    case "COMPLETE": {
      return (
        "Your application has already been submitted. " +
        "Our team will reach out to you shortly.\n\n" +
        "_Type RESTART to begin a new application._"
      );
    }

    default:
      await clearSession(from);
      return "Something went wrong. Type RESTART to begin again.";
  }
}

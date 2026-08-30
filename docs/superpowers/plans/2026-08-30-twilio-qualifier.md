# Twilio Qualifier and Studio LLM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google AI Studio-backed health signal and a secure, idempotent Twilio WhatsApp four-turn qualifier to the existing production application.

**Architecture:** Extend the existing signed Twilio webhook, Redis dedupe, Prisma `Lead`, and current sender helpers. Store qualifier state in lead metadata, return TwiML for approved freeform replies, and use AI Studio first with optional OpenRouter and deterministic fallback.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Redis, `@ai-sdk/google`, Vercel Functions, Twilio WhatsApp Sandbox.

**Spec:** User-provided remaining-task execution prompt (2026-08-30).

## Global Constraints

- Work only on `shadowspark-production` in SHADOW TEAM; leave the live website unchanged.
- Use `GEMINI_API_KEY` with Google AI Studio; never use Vertex AI or `GOOGLE_GENAI_USE_VERTEXAI`.
- Use Twilio Sandbox variables and never expose secret values.
- Enforce a hard cap of 80 outbound messages per UTC day.
- Do not buy numbers, rotate keys before webhook verification, force-push `main`, or start unrelated Alibaba/social/ShortcutOS work.

### Task 1: Provider selection and health

**Files:** `src/lib/llm.ts`, `src/app/api/health/route.ts`, `tests/llm-provider.test.ts`

- [x] Test Studio selection, 10-second timeout, OpenRouter fallback, deterministic fallback, and non-secret status reporting.
- [x] Implement provider selection with the installed Google AI SDK and current Flash-Lite model.
- [x] Extend `/api/health` with `ok`, `llm`, and `twilioConfigured` fields while preserving existing database/Redis checks.
- [x] Run focused tests, touched-file lint, and typecheck.

### Task 2: Four-turn Twilio qualifier

**Files:** `src/lib/twilio-qualifier.ts`, `src/app/api/webhooks/twilio/route.ts`, `src/lib/twilio.ts`, `tests/twilio-qualifier.test.ts`

- [x] Test signature rejection, MessageSid dedupe, four turns, Hot/Warm/Cold tags, lead persistence, 24-hour freeform, and the 80-message cap.
- [x] Implement the qualifier on the existing non-versioned Twilio route; leave the versioned loan/KYC route unchanged.
- [x] Persist answers and session metadata in `Lead.metadata`, and notify `TWILIO_NOTIFY_TO` once when configured.
- [x] Return escaped TwiML and suppress unapproved replies outside 24 hours.
- [x] Run focused tests and touched-file lint.

### Task 3: Verification and deployment

**Files:** `.env.example`, `IMPLEMENTATION_NOTE.md`

- [x] Run typecheck, focused lint, focused tests, full tests, and production build.
- [x] Write exactly 10 lines in `IMPLEMENTATION_NOTE.md` describing shipped behavior, environment names, webhook, verification, deployment, and leftovers.
- [x] Verify the SHADOW TEAM project and production environment-variable names without reading values.
- [ ] Add missing production variables only through protected Vercel prompts.
- [ ] Deploy only `shadowspark-production`, then report the webhook URL and sandbox test steps.

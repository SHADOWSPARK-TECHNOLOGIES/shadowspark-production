# SHADOWSPARK_RULES.md (v2 - token‑optimised)

You are helping build ShadowSpark, an AI‑driven B2B revenue engine.

**Stack:**
- Next.js 15 (App Router, Tailwind), Prisma 7.7.0, PostgreSQL + pgvector (Cloud SQL)
- Gemini `text‑embedding‑004`, Resend, NextAuth (JWT), BullMQ (to be replaced)
- DB access via Cloud SQL Auth Proxy (127.0.0.1:5433, IAM ADC)

**Critical Architecture Rules (NEVER break):**
- No `pg`, `PrismaClient`, or Node crypto in `middleware.ts` or Edge files.
- All DB ops in Node.js (API routes, server actions, workers).
- Always `npx prisma generate` after schema changes.

**Key Models:**
- `Lead` (email, status, score, tier, nextFollowUpAt)
- `SystemEvent` (type, actor, payload) – all tracking
- `EmailEvent` (leadId, type, metadata)
- `KnowledgeEmbedding` (text, embedding vector(768), source, metadata)

**RAG Behaviour:**
- Hybrid retrieval (cosine 0.7 + keyword 0.3, threshold 0.6)
- LRU cache (3600s, max 100)
- Anti‑hallucination guard: if no context, fallback reply.

**Checkout UI spec (simplified):**
- `src/app/checkout/[leadId]/page.tsx`:
  - Left title: "Engine Tier: Semantic Growth"
  - 3 action bullets (Activate Semantic Lead Capture, Deploy WhatsApp‑to‑Vault, Track Intent & Conversions)
  - Price: "₦15,000" (no $). Paystack amount ⇒ 1500000 kobo.
  - Keep existing hooks/Tailwind classes.

**Token discipline:**
- For a single file change → max 4k tokens (use Copilot inline).
- For 2‑3 files → max 8k tokens (use Gemini CLI with `@./file`).
- For architecture design → DeepSeek with this file injected.
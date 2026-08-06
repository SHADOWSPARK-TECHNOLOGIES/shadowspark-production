# ShadowSpark Agent Skills Manifest
Version: 1.0.0
Activation: `LOAD SKILLS FROM .gemini/skills.md`

## Skill: Architect
- **Domain:** System design, infrastructure, deployment, environment configuration.
- **Responsibilities:**
  - Diagnose and fix Next.js, Prisma, Auth.js, and Cloud Run issues.
  - Manage `.env.local`, `next.config.ts`, and deployment configs.
  - Ensure V1 charter compliance for hosting (Firebase App Hosting preference, avoid Cloud Run domain mappings).
- **Default Actions:** Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` after any structural change.
- **Proactive Checks:** Warn if `AUTH_SECRET` missing, if Cloud Cloud Run domain mappings detected, if pricing math incorrect.

## Skill: CFO
- **Domain:** Financial modeling, pricing strategy, revenue tracking, goal progress.
- **Responsibilities:**
  - Maintain and update `/Sovereign_Vault/goal_tracker.md` (or equivalent).
  - Calculate weighted pipeline value using correct pricing math:
    - ₦35k/mo = ₦420k/yr (not ₦180k)
    - ₦75k/mo = ₦900k/yr (not ₦420k)
    - ₦150k/mo = ₦1.8M/yr (not ₦800k)
  - Report progress toward ₦1.5M goal.
- **Default Actions:** After each lead ingestion or payment, update tracker and output CFO summary.

## Skill: Archivist
- **Domain:** Vector indexing, document retrieval, vault management.
- **Responsibilities:**
  - Index critical files from `/Sovereign_Vault` using AnythingLLM API.
  - Monitor RAM usage during indexing; pause if >85%.
  - Provide retrieval‑augmented context to other agents when asked.
- **Proactive Checks:** Alert if vault mount is read‑only when writes expected.

## Skill: Strategist
- **Domain:** Business strategy, niche positioning, closing plans.
- **Responsibilities:**
  - Draft 3‑step closing plans for high‑value leads.
  - Analyze market signals from chat logs.
  - Recommend package fit based on lead qualification data.
- **Default Actions:** When a manual lead is injected, create a strategy note in `/Sovereign_Vault/strategy_notes/`.

## Skill: Revenue_RevOps_Hunter
- **Domain:** Lead generation, pipeline building, outbound strategy.
- **Responsibilities:**
  - Extract leads from Cloud Run logs, WhatsApp, or manual input.
  - Qualify leads using V1 criteria: business type, required features, contact info.
  - Identify warm leads from cold data (e.g., past invoices, email archives).
- **Default Actions:** Run `gcloud logging read` daily to pull new leads; append to goal tracker.

## Skill: UX_Sorcerer
- **Domain:** Frontend polish, conversion copy, visual identity.
- **Responsibilities:**
  - Ensure homepage and demo renderer follow "Obsidian + Spark Cyan" aesthetic.
  - Remove boilerplate assets (vercel.svg, next.svg).
  - Write compelling copy aligned with V1 charter.
- **Proactive Checks:** Verify no 404s on key assets; ensure CTA buttons point to correct routes.

## Skill: Security_Sentinel
- **Domain:** Auth, secrets, environment hardening.
- **Responsibilities:**
  - Detect missing `AUTH_SECRET` and generate it.
  - Validate GCP IAM bindings before destructive operations.
  - Flag preview features in production (e.g., Cloud Run domain mappings).
- **Default Actions:** On startup, check for `.env.local` and warn if secrets are exposed.

## Meta-Skill: Recursive_Architect
- **Combines:** Architect + Strategist + CFO
- **Use when:** Planning a major phase or handover.
- **Output:** Full system HUD with compute, vault, hybrid brain, and revenue status.

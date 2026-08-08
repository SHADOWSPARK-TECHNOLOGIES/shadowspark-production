
# SHADOWSPARK ENTERPRISE FINTECH OS: ARCHITECTURAL GUIDELINES

You are the Lead Systems Architect for the ShadowSpark Enterprise Fintech platform.

## 1. PRESERVATION OF EXISTING SYSTEMS
- DO NOT MODIFY any files within `.gemini/` or `.vscode/gemini-mcp/`.
- DO NOT MODIFY `.github/workflows/firecrawl.yml`, `Dockerfile`, `SHADOWSPARK_RULES.md`, or `CLAUDE.md`.

## 2. MULTI-TENANT DATABASE ENFORCEMENT
- Our architecture relies on a shared database with row-level isolation via a `tenantId`.
- MANDATORY: Every Prisma schema model (except `Tenant`) MUST include a `tenantId` field (`String`).
- MANDATORY: Every Prisma query MUST be scoped by `tenantId` via a central middleware/extension.

## 3. TECH STACK & CONVENTIONS
- Framework: Next.js 15 (App Router).
- Language: TypeScript (Strict mode, no `any`).
- ORM: Prisma + Neon PostgreSQL.
- Validation: Zod for all API inputs.
- Background Jobs: BullMQ + Redis.

## DATA SPECIALIZATION (NON-NEGOTIABLE)
- Money = Prisma Decimal, never Float. Dates = ISO strings.
- Seeds must be idempotent (upsert by slug/email), tenant-scoped, NO real BVN/NIN/phones.
- Nigerian realism: names across Yoruba/Igbo/Hausa, +234 phones, ₦50k–₦5M.
- VERIFY via the shadowspark-db MCP datasource (SELECT counts) before reporting success.
- Never assume a table has data. Query it.

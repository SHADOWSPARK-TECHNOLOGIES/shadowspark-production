# SHADOWSPARK MASTER SYSTEM ARCHITECTURE (2026 REVENUE ENGINE)
Entity: ShadowSpark Technologies | Founder: Okoronkwo Stephen Chijioke
Platform Objective: Lodgist AI Micro-Services & Automated Tenant Verification SaaS
Capital Allocation Strategy ($50 Total Float):
  - $20.00 -> Vercel Pro Plan (AI Gateway, Sandboxes, Fluid Compute, OIDC auth)
  - $10.00 -> Primary Custom Domain & DNS Infrastructure (shadowspark-tech.org / lodgist)
  - $20.00 -> Paystack Operational Reserve & Webhook Liquidity Float

--------------------------------------------------------------------------------

## 1. CORE TECH STACK & COMPUTATION BOUNDARIES
  - Frontend & Framework: Next.js 15 (App Router, Server Actions, React Server Components)
  - Data & DB Layer: Prisma ORM v6 + Serverless Neon PostgreSQL (Multi-tenant schema)
  - AI Model Orchestration: Vercel AI SDK (v4+) via Vercel AI Gateway
    * Primary Model: Google Gemini 1.5 Pro (`google/gemini-1.5-pro`)
    * Secondary / High-Speed: DeepSeek V4 / Flash (`deepseek/deepseek-chat`)
    * Fallback Tier: Anthropic Claude 3.5 Sonnet (`anthropic/claude-3.5-sonnet`)
  - Execution Isolation: Vercel Sandbox (`@vercel/sandbox` + `ai-sdk-tool-code-execution`)
  - Payments & Entitlements: Paystack Billing API (NGN/USD webhooks with cryptographic HMAC verification)

## 2. SECURITY & GOVERNANCE BOUNDARIES
  - Zero Hardcoded Keys: Authenticate Vercel AI Gateway & Sandboxes via Vercel OIDC (`VERCEL_OIDC_TOKEN`)
  - WAF & Rate Limiting: Strict OWASP headers, Vercel Edge Firewall, 20 requests/min per IP on `/api/agent/*`
  - Access Control: Role-Based Access Control (RBAC) scoped per tenant & enterprise session
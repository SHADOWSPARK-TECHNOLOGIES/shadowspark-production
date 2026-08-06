# SYSTEM MEMORY – SHADOWSPARK

## SYSTEM SNAPSHOT
- Stack: Next.js 14 App Router + Prisma (PostgreSQL) + NextAuth v4
- Auth: JWT + RBAC (USER/ADMIN)
- Status: Live
- Database: Google Cloud SQL (PostgreSQL)

## PIPELINE ARCHITECTURE
- **Knowledge Store:** Firecrawl + JSON fallback (pgvector planned)
- **Tracking:** Resend webhooks -> SystemEvent -> Real-time Lead Scoring
- **AI Engine:** Chatbot (`/api/assistant`) with explicit `createLead` and `scheduleDemo` tools. Intent-aware dynamic routing active.
- **Outbound:** Sniper scraping + Autonomous Follow-up workers
- **Checkout:** Paystack integration + Funnel tracking (`CHECKOUT_VIEWED`, `PAYMENT_SUCCESS`)

## CONVERSION PROTOCOL (ACTIVE)
- **Tripwire:** $10 Refundable System Audit.
- **Drop-off Recovery:** Abandoned checkout reminders active for `HIGH_INTENT` or `enterprise` tier leads.
- **Closing Strategy:** AI enforces Value-First layout. Identifies gaps, pitches the $10 tripwire, closes loop.

## RECENT CHANGES
**2026-04-21 – Conversion Hardening & Cloud Migration**
- Migrated local PostgreSQL to Google Cloud SQL instance.
- Upgraded to Prisma v7 with `@prisma/adapter-pg`.
- Rebuilt `/checkout/[leadId]` UI with psychological trust markers and $10 refundable pitch.
- Connected automated follow-up workers for abandoned cart recovery.

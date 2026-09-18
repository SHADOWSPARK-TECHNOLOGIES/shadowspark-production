# Execution Plan — orchestrator_3

## Objective
Harden production readiness across Security, Product, Observability, E2E, and Commercial tracks. Handle Paystack blocker with safe fallback UX under Ponytail discipline.

## Phase 1: Parallel Multi-Track Discovery (Many Readers)
- **Track A (Security)**: Audit protected routes, auth/session fail-closed behavior, tenant isolation, secret scanning, AI-ASSIST server boundary.
- **Track B (Product & Payment Fallback)**: Inspect landing page, demo/contact CTA, login, dashboard, review queue/detail states, Paystack checkout status and fallback message/CTA routing.
- **Track C (Observability)**: Inspect health endpoints (`/api/health`, etc.), error logging, structured logging, Netlify/Render/Neon visibility, secret scrubbing.
- **Track D (E2E Customer Journey)**: Inspect user flow from visitor → demo/contact → login → dashboard → review/compliance → pilot onboarding → manual payment path → success signal. WhatsApp flow safety.
- **Track E (Payment Fallback & Commercial Docs)**: Inspect commercial collateral, demo runbook, pilot offer, onboarding runbook, customer evidence tracking, manual invoice/bank-transfer operational runbook, Paystack dependency doc.

## Phase 2: Synthesis & Prioritization
- Aggregate findings from all 5 tracks.
- Classify into:
  - P0 Security Findings (must fix)
  - P1 Customer / Reliability / Revenue Blockers (must fix)
  - Backlog / Deferrals (documented per Ponytail)
- Define exact minimal diff and files for Single Writer.

## Phase 3: Single Writer Implementation (One Overlapping Writer)
- Dispatch single worker with bounded write domain and strict Ponytail discipline.
- Minimal implementation: reuse existing primitives, standard/installed dependencies only, zero speculative code.
- Ensure all tests, secret checks, typechecks pass.

## Phase 4: Independent Verification & Gate
- Dispatch Reviewers and Empirical Challenger.
- Dispatch Forensic Auditor (`teamwork_preview_auditor`).
- Gate check: all pass, 0 integrity violations.

## Phase 5: Final Acceptance Report & State Preservation
- Update engineering ledgers and documentation.
- Deliver structured final report matching the user's required schema.

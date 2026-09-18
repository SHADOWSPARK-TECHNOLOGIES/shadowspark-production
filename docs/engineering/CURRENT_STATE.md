# ShadowSpark Production — Current State

> Last updated: 2026-09-18T14:27:32Z
> Engineering mode: **MAINTENANCE_ONLY**

---

## Engineering Mode

```
MAINTENANCE_ONLY

Reopen implementation ONLY for:
  P0 SECURITY
  P1 CUSTOMER BLOCKER
  P1 RELIABILITY BLOCKER
  P1 REVENUE BLOCKER

Everything else → BACKLOG
```

---

## Verified HEAD State

| Field | Value |
|---|---|
| Branch | `agent/agy-production-readiness` |
| HEAD | `619ede9` |
| Merged into `main` via | PR #108 |
| Tests | 309 passed, 0 failed (42 suites) |
| Secret scan | 9/9 passed |
| TypeScript | 0 errors |
| Build | All routes compiled ✅ |

---

## Deployment Status

| Platform | Status | Notes |
|---|---|---|
| Netlify | ✅ Deploy preview passed | Production deploy on merge to `main` |
| Vercel | ❌ EXTERNAL_ACCOUNT_BILLING_BLOCKER | Non-code, non-gating — account issue |
| Neon (DB) | ✅ Operational | Prisma connection healthy |

---

## External Blockers

| Blocker | Owner | Action Required |
|---|---|---|
| **Paystack onboarding** | Operator | Complete CAC/business verification with Paystack. Until resolved, manual invoice/bank-transfer fallback is active. |
| **Vercel billing block** | Operator | Resolve billing issue directly with Vercel. Netlify is the active host. |

---

## Completed Milestones (This Phase)

- [x] C3 proxy auth SSRF fix (unauthenticated catch-all proxy hardened)
- [x] CORS restricted to authoritative domains
- [x] Client-supplied tenant headers stripped from proxy
- [x] Operator queue-stats session-guarded
- [x] Cron/sniper secret truthiness guards
- [x] Paystack checkout disabled with intentional safe fallback UX
- [x] `/api/ready` endpoint created
- [x] `/api/health` enhanced (uptime, AI reachability)
- [x] PII masked in background workers
- [x] Credential scanner false-positive fixed
- [x] Commercial docs: DEMO_RUNBOOK, PILOT_OFFER, CUSTOMER_ONBOARDING_RUNBOOK, CUSTOMER_EVIDENCE_TRACKING, MANUAL_PAYMENT_FALLBACK_RUNBOOK, PAYSTACK_DEPENDENCY

---

## Customer-Launch Status

```
SECURITY_READY=YES
PRODUCT_READY=YES
OBSERVABILITY_READY=YES
E2E_READY=YES
PAYMENT_FALLBACK_READY=YES

PAYSTACK_STATUS=EXTERNAL_BUSINESS_ONBOARDING_BLOCKER

DEMO_READY=YES
PILOT_READY=YES
CUSTOMER_READY=YES
```

---

## Rollback Notes

- Rollback target: `99d29ae` (last stable pre-hardening commit)
- Command: `git revert a1dc73d 619ede9` (preferred — preserves history) or `git reset --hard 99d29ae` (hard reset — destructive)
- All changes are additive hardening; no schema migrations were applied in this phase.

---

## Backlog (Do Not Implement in Maintenance Mode)

- Full Paystack live integration (blocked externally)
- WhatsApp deeper automation
- Speculative features not classified P0/P1

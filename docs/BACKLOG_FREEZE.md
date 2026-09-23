# Engineering Backlog Freeze — ShadowSpark Control Plane

**Policy**: Only items categorized as `CUSTOMER_BLOCKING`, `REVENUE_BLOCKING`, `SECURITY`, or `RELIABILITY` may interrupt customer acquisition, demos, and pilot onboarding. All `NICE_TO_HAVE` and `EXPERIMENT` items are strictly frozen.

---

## Active Priority Queue (Permitted to Interrupt if Triggered)

| Category | Item | Current Status | Trigger Condition |
| :--- | :--- | :--- | :--- |
| **RELIABILITY** | Render Free-Tier Spin-down Wakeup | In Monitoring | If pilot customer experiences cold start latency >10s during active pilot, upgrade to Render Starter instance ($7/mo). |
| **CUSTOMER_BLOCKING** | Seeded Demo Data Generator | Planned | Create optional script to populate synthetic flagged exceptions into a demo tenant queue for live presentations. |
| **REVENUE_BLOCKING** | Automated Paystack Subscription Webhook | Staged | Automatic tenant tier activation when customer pays ₦150k/₦450k on `/checkout/new`. |
| **SECURITY** | Passkey Registration & Verification | In Containment (503) | Re-open only after full W3C WebAuthn signature assertion and hardware registration pipeline is implemented. |

---

## Frozen Backlog (Strictly Prohibited from Interrupting)

| Category | Item | Rationale for Freeze |
| :--- | :--- | :--- |
| **NICE_TO_HAVE** | Dark/Light mode theme toggle for dashboard | Current dark theme matches institutional sovereign wealth branding. |
| **NICE_TO_HAVE** | Advanced column customizer in DataTable | 5 standard columns (ID, timestamp, counterparty, risk, status) satisfy all pilot requirements. |
| **NICE_TO_HAVE** | Animated chart transitions on analytics page | Does not affect compliance triage accuracy or speed. |
| **EXPERIMENT** | AgentOS plugin migration | Production is stable on Next.js 16 / Netlify. Platform migrations distract from revenue. |
| **EXPERIMENT** | Multi-LLM consensus voting engine | Upstream AI-ASSIST v1.1.0 contract is frozen and verified healthy. |
| **EXPERIMENT** | Alternative vector database integrations | Neon pgvector + embedding store is operational and sufficient for current volume. |

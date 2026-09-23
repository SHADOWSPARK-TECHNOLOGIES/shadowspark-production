# Security Review Skill (Local Copy)
Source: /home/moronto/Documents/Codex/2026-09-14/re/work/shadowspark-production/.agents/skills/security-review/SKILL.md
Methodology: Comprehensive security review covering the 10 critical fintech/compliance attack surfaces: Tenant Bypass, IDOR, Service-Token Leakage, Unsafe Retries & Idempotency, PII Leakage, Auth Confusion & RBAC, CORS/Host, Injection (SQL/Prompt), Generic Proxy Misuse, Unsafe Defaults.
Enforces fail-closed security, authoritative tenant derivation, immutability of audit records, and strict advisory-only containment for AI models (sor_status_unchanged: true).

# AGENTS.md — ShadowSpark Production

You are working in **`SHADOWSPARK-TECHNOLOGIES/shadowspark-production`**.

This file supersedes stale stack claims in `SHADOWSPARK_RULES.md`. It extends, and does not discard, the existing evidence / tenant / idempotency charter already in this repository’s `AGENTS.md` at capture. After install, this file is the Cursor-facing charter.

## Entropy

Default to **E0 (read-only Truth Auditor)** in a new session.

```text
E0  Truth Auditor          read-only
E1  Senior Fixer           one bounded unit
E2  Principal panel        architecture / security / data / QA
E3  Coordinator            multi-repo — not an unlimited writer
```

Read `SNAPSHOT.md` and `.cursor/rules/` before writing.

## Captured main (historical)

```text
487350dc7c074ecbff12d9e5344f8bb2237abb06
fix(deps): override critical shell-quote and websocket-driver (#120)
```

Re-fetch `origin/main` before acting.

## Actual stack (from package.json @ captured SHA)

| Piece | Observed |
|---|---|
| Node | `24.x` (`engines`) |
| Next | **16.3.4** (devDependency — do not “correct” to 15) |
| React | 19.2.4 |
| Prisma | 7.7.x + `@prisma/adapter-pg` + `pg` Pool |
| Auth | `next-auth` **5.0.0-beta.32** |
| Queues | BullMQ 5.73.x, ioredis 5.10.x |
| Crawl | `@mendable/firecrawl-js` ^4.18.2 |
| Pay | `react-paystack` |
| Email | `resend` ^6.12.2 |
| Tests | Vitest ^5, plus `npm run test:secrets` |

`SHADOWSPARK_RULES.md` still says Next.js 15, Cloud SQL proxy 5433, and “BullMQ (to be replaced)”. **Manifest + tree win.**

## Structure

This is a **single Next.js App Router repo** at `src/app/`, not `apps/lodgist`. Routes include `(auth)`, `(marketing)`, `api`, `dashboard`, `checkout`, `admin`, `operator`.

## Recent real work (do not regress)

- **#118** WebAuthn/passkeys **disabled by default**. `WEBAUTHN_ENABLED` opt-in. Do not re-enable without RP/origin parity evidence.
- **#119** Firecrawl `rag:sync` must skip BullMQ when `CI`, `RAG_SYNC_SKIP_QUEUE`, or no `REDIS_URL`. Nightly CI has no Redis; importing the worker hung ~75 minutes.
- **#120** pnpm overrides for `shell-quote` and `websocket-driver` are load-bearing. Keep them.
- **#117** Open registration must not grant global `ADMIN`. Tenant-owner ADMIN only.
- **#116** `rag:sync` must not use `tsx --env-file=.env` in CI (exit 9).
- **#121** axios `>=1.16.0` override was **open** at capture. Check if still open before duplicating it.
- **#91** “make Redis optional” was still open. Do not assume Redis is required for the web request path.

## Evidence discipline (keep from prior AGENTS.md)

- Never invent files, APIs, commands, or test results.
- Distinguish observed / inferred / unknown / stale.
- Tenant identity only from verified server-side auth + `TenantMembership`. Never from body/query/untrusted headers.
- Money: Prisma `Decimal`, not IEEE-754 `number`.
- Mutating external APIs: idempotency keys.
- Fail closed on auth/RBAC/tenant miss → 401/403.
- Do not merge PRs unless the human explicitly authorizes it.
- Do not commit `.env*`. Run credential-leak tests before calling a change done.
- Do not modify `.github/copilot-instructions.md`.

## Write rules

- One overlapping surface per writer.
- No Edge/`middleware.ts` Prisma, `pg`, or Node crypto.
- `npx prisma generate` after schema changes (Prisma 7 adapter path).
- Prefer `pnpm` scripts already in package.json (`test`, `typecheck`, `lint`, `test:secrets`).

## First output

Local vs remote audit, then one next safe unit. Do not start a feature dump.

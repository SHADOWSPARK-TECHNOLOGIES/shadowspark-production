# SNAPSHOT — shadowspark-production

Captured **2026-09-22T20:40Z**. Re-verify before write.

## Identity

- GitHub: `https://github.com/SHADOWSPARK-TECHNOLOGIES/shadowspark-production`
- Visibility: public
- Default branch: `main`
- Captured HEAD: `487350dc7c074ecbff12d9e5344f8bb2237abb06`
- Vercel hostname (repo homepage): `https://shadowspark-production.vercel.app`
- Alternate health URL recorded 2026-08-25: `https://shadowspark-production-pi.vercel.app/api/health` → HTTP 200, DB connected, Redis **not** configured, vector count **0**
- Canonical Vercel owner (Drive): `morontomornica7@gmail.com` / SHADOW TEAM — not the wonderstevie702 workspace

## Stack (package.json)

```text
Node 24.x
Next 16.3.4
React 19.2.4
Prisma 7.7.x + @prisma/adapter-pg
NextAuth 5.0.0-beta.32
BullMQ ^5.73.5
ioredis ^5.10.1
@mendable/firecrawl-js ^4.18.2
react-paystack
resend ^6.12.2
vitest ^5.0.0
```

Note: `next` / `react` currently sit in **devDependencies**. Observed; do not “fix” unless that is the unit.

## Contradiction

`SHADOWSPARK_RULES.md` still says Next.js 15 + Cloud SQL proxy on 5433. Current tree is Next 16.3.4 App Router at `src/app` with Prisma pg adapter. **Tree wins.**

`CLAUDE.md` still describes `apps/lodgist` + `apps/shadowspark-site`. This checkout is not that monorepo.

## PRs at capture

Merged on captured main: #105 (WhatsApp creds removed), #106 AI-ASSIST, #107 Netlify/edge auth, #108 production readiness, #109 next-auth beta.32, #110/#112/#114/#115 docker/CI, #116 .env CI, #117 no global ADMIN, #118 WebAuthn off by default, #119 Firecrawl/BullMQ CI, #120 shell-quote + websocket-driver overrides.

Open: **#121 axios override**, **#91 Redis optional**.

## Workflows

`credential-leak.yml` · `docker-publish.yml` · `firecrawl.yml` · `github-coverage.yml` · `typecheck.yml`

Firecrawl nightly has no Redis. Queue skip flags are required.

## Suggested first E0 checks

```text
git rev-parse HEAD
git fetch origin main && git rev-parse origin/main
git status --porcelain
gh pr view 121 --json state,title,mergeable   # or GitHub UI
```

Do not print env values. Do not open Drive `.env*` backups.

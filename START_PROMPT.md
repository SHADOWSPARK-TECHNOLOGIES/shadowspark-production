# START PROMPT — shadowspark-production

Paste this as the first message after opening the production checkout in Cursor.

---

You are on **shadowspark-production**. Read `AGENTS.md`, `SNAPSHOT.md`, and `.cursor/rules/` first.

Stay at **E0 (read-only)** until you produce this table from this session’s commands:

```text
REPO
LOCAL HEAD
REMOTE HEAD
DIRTY
CI
LIVE PROVIDER
LIVE REVISION
P0
NEXT SAFE UNIT
```

Captured remote `main` at pack time:

```text
487350dc7c074ecbff12d9e5344f8bb2237abb06
```

That SHA is historical. Fetch again.

Constraints:

- Actual stack is Next **16.3.4**, React 19.2.4, Prisma 7.7, NextAuth v5 beta.32, BullMQ, Firecrawl, Paystack, Resend, Vitest 5, Node 24. Ignore `SHADOWSPARK_RULES.md` saying Next.js 15.
- WebAuthn is **disabled by default** (#118). Do not turn it on.
- Do not import BullMQ workers in CI rag:sync (#119).
- Keep shell-quote / websocket-driver overrides (#120).
- Check whether axios override **#121** is still open before duplicating it.
- Tenant isolation, Decimal money, fail-closed auth, no secrets in git.
- One next safe unit. No feature dump. No commit/push/merge unless I explicitly ask.

If local HEAD ≠ remote HEAD or the tree is dirty, report that and stop.

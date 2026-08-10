# ShadowSpark engineering instructions

## Stack
- Next.js App Router with TypeScript strict mode
- Prisma with PostgreSQL
- BullMQ with hosted Redis/Upstash
- Vercel deployment
- pnpm is the only supported package manager

## Safety and production rules
- Production must never silently fall back to localhost, 127.0.0.1, or default service endpoints.
- Environment variables and credentials must never be logged, committed, exposed to client components, or added to example values.
- Keep Prisma, Redis, queue workers, and service keys server-only.
- Validate external input and preserve authorization checks.
- Do not use `prisma db push` for production workflows.
- Do not add dependencies unless the issue explicitly permits it.

## Code rules
- Prefer the smallest safe patch; do not refactor unrelated code.
- Reuse shared service clients; do not create duplicate Redis connections.
- Use explicit TypeScript types at external boundaries.
- Keep API contracts and response shapes backward-compatible.
- Add or update tests for every bug fix.
- Run lint, typecheck, tests, and production build before declaring completion.

## Pull request format
Every PR must include:
1. Root cause
2. Files changed and why
3. Verification commands and results
4. Environment variable names required, never values
5. Risks, rollback plan, and follow-up work

# seed-production

Verified procedure for production Neon seeding in this monorepo.

## Goal
Run `prisma/seed.ts` locally against Neon safely when shell env is unreliable.

## Preconditions
- `prisma/seed.ts` resolves DB URL in this order:
  1. `process.env.DATABASE_URL` (if set)
  2. `/tmp/dburl.txt` (if env is missing)
- Seed constructs Prisma with explicit adapter URL:
  - `new PrismaPg({ connectionString: url })`
  - `new PrismaClient({ adapter })`
- URL is normalized to include:
  - `pgbouncer=true`
  - `sslmode=require`

## Safe execution path
1. Put the Neon pooled URL in `/tmp/dburl.txt` using editor (not shell paste).
2. Ensure command ignores hostile shell env for this run:
   - `env -u DATABASE_URL npx tsx prisma/seed.ts`
3. Confirm diagnostics in output:
   - `[diagnose] process.env.DATABASE_URL hostname: <unset>` or Neon host
   - `[diagnose] runtime datasource source: file` (or `env`)
   - `[diagnose] effective datasource hostname: ep-*.neon.tech`
4. Confirm seed exits with code `0`.

## Required post-seed counts
Seed prints a `ROW COUNTS` block for:
- `Tenant`
- `User`
- `LoanApplication`
- `KycDocument`
- `Message`
- `Workflow`
- `AuditLog`

If a model delegate is unavailable, count prints `MISSING`.

## Validation checklist
- Hostname probe prints `ep-*.neon.tech`.
- Seed log reaches `CHART OF ACCOUNTS SECURED`.
- Command exit code is `0`.
- `ROW COUNTS` table is present with all required labels.

## Security rules
- Never print full connection strings.
- Never commit `.env*`.
- Keep DB URL in `/tmp/dburl.txt` or secure env injection only.

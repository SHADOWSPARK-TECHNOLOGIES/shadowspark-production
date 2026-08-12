# High-Level Architecture (Current)

This document reflects the current code in `shadowspark-production` as of PR #49.

## Layers

| Layer | Purpose | Key Tech / Folders |
| --- | --- | --- |
| Next.js App | Marketing pages + API routes (App Router). | `src/app/` |
| Domain Utilities | Thin typed helpers (env, Redis/BullMQ, Firecrawl, RAG). | `src/lib/` |
| Data | Normalized Postgres schema managed by Prisma. | `prisma/schema.prisma` |
| Async Jobs | BullMQ workers for queue-driven jobs. | `src/workers/` |
| AI + RAG | Firecrawl crawl → chunk → embed (Gemini) → JSON index → retrieval hook. | `src/lib/firecrawl.ts`, `src/lib/rag/*`, `data/rag/` |
| DevOps | CI/CD + scheduled jobs. | `.github/workflows/`, `scripts/` |
| Tests | Vitest unit tests. | `tests/`, `vitest.config.ts` |

## Front-End (Next.js)

* App Router lives under `src/app/**`.
* The current repo pins Next.js at `16.2.0-canary.98` (see `package.json`).

## Domain Utilities (`src/lib/`)

| File / Folder | Role |
| --- | --- |
| `env.ts` | `optionalEnv`/`requireEnv` helpers used by server-side code paths. |
| `redis.ts` | Optional ioredis singleton. It is created only when `REDIS_URL` is configured; there is no localhost default. |
| `leads/queue.ts` | Existing BullMQ lead-sync queue helper. |
| `crawl/queue.ts` | New BullMQ crawl queue helper (`crawl-queue`). |
| `queue.ts` | Barrel re-export for queues (`crawl` + `lead-sync`). |
| `firecrawl.ts` | Firecrawl client singleton (`FIRECRAWL_API_KEY` required). |
| `rag/sync.ts` | Crawl + chunk + embed pipeline that writes `data/rag/index.json`. |
| `rag/store.ts` | JSON index loader (defaults to `data/rag/index.json`). |
| `rag/retrieve.ts` | Query embedding + cosine similarity retrieval over the local index. |

## Prisma Layer (Current Models)

The current `prisma/schema.prisma` contains:

* `Lead`
* `User`
* `Payment`
* `Demo`

There is no `pgvector` schema in this repo today; RAG is file-backed via `data/rag/index.json`.

## Crawl + RAG Flow

```mermaid
flowchart LR
  subgraph Nightly Job
    A[GitHub Actions schedule] --> B[pnpm rag:sync]
  end
  B --> C[Firecrawl crawl]
  C --> D[Markdown docs]
  D --> E[Chunking]
  E --> F[Gemini embeddings: text-embedding-004]
  F --> G[data/rag/index.json]
  G --> H[retrieveRagContext()]
  H --> I[/api/assistant]
```

### Triggers

* GitHub Action: `.github/workflows/firecrawl.yml` runs `pnpm rag:sync` nightly.
* App cron endpoint: `GET /api/cron/rag-sync` (protected by `CRON_SECRET`) enqueues a BullMQ job.

### Queue + Worker

* Queue: `src/lib/crawl/queue.ts` (`crawl-queue`).
* Worker: `src/workers/crawl-worker.ts` runs `runRagSync()` for queued jobs.
* When `REDIS_URL` is absent, queue producers execute the same processor inline and emit one process-level fallback warning. Loan idempotency uses the tenant-scoped database unique key, and conversation state uses a process-local TTL store.
* Inline execution is synchronous and has no BullMQ retry, delay, or cross-process durability. Configure `REDIS_URL` to retain the existing asynchronous BullMQ behavior.

### Embedding Provider

* Embeddings are generated via the existing Google provider in this repo:
  * `@ai-sdk/google` + `ai` (`embedMany`)
  * Model id: `text-embedding-004`

### Retrieval

* `src/lib/rag/retrieve.ts` embeds the query, ranks chunks by cosine similarity, and injects a context block into the assistant system prompt (`src/app/api/assistant/route.ts`).

## DevOps / CI

* `pnpm tsc --noEmit` is the typecheck gate.
* `pnpm test` runs Vitest.
* The nightly Firecrawl workflow currently commits changes to `data/rag/index.json` directly to the default branch; hardening (PR-based updates, diff guardrails, notifications) is tracked in FC-06.

## Environment Variables (Key)

* `FIRECRAWL_API_KEY`: required for crawl.
* `GEMINI_API_KEY`: required for embeddings + assistant.
* `REDIS_URL`: optional. When present, BullMQ queues and workers use Redis unchanged; when absent, jobs run inline.
* `CRON_SECRET`: required to call `/api/cron/*` endpoints.

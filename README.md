ShadowSpark production app (Next.js App Router + Prisma + BullMQ + Firecrawl RAG).

Architecture: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Deploy on Railway

Production hosting is Railway. The service runs the Docker image in `Dockerfile` (Node 24, pnpm, Next.js standalone) and listens on port 8080. `GET /api/health` is the container health check.

Set `AUTH_SECRET` in the Railway service environment. Set `AUTH_URL` or `NEXTAUTH_URL` to the public origin. Auth trusts Railway's forwarded host. When neither URL is set, the app uses `RAILWAY_PUBLIC_DOMAIN`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

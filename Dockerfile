# ---------- Base (build stages only; pnpm is not copied into the runtime image) ----------
FROM node:24-alpine AS base
RUN apk upgrade --no-cache \
  && apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy prisma schema so postinstall generate works (or skip it)
COPY prisma ./prisma
ENV SKIP_PRISMA=false
RUN pnpm install --frozen-lockfile

# ---------- Builder ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Rebuild Prisma client after COPY . . wipes gitignored src/generated
RUN pnpm exec prisma generate && pnpm build

# ---------- Runner ----------
FROM node:24-alpine AS runner
RUN apk upgrade --no-cache \
  && apk add --no-cache libc6-compat openssl curl tini \
  && rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080

# Health check — pings the health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Use tini as init to handle zombie reaping and signal forwarding
ENTRYPOINT ["/sbin/tini", "--"]

# Next.js standalone server. Same process as `next start`, without pnpm in the image.
CMD ["node", "server.js"]

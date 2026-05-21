import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends({
    query: {
      systemEvent: {
        async create({ args, query }) {
          const result = await query(args);

          if (args.data.type === "intent_signal") {
            const metadata = args.data.metadata as any;
            const leadId = metadata?.leadId;

            if (leadId) {
              // Dynamic import prevents circular dependency issues
              import("./scoring/engine")
                .then(({ evaluateIntentSignal }) => {
                  const delta = evaluateIntentSignal(metadata);

                  if (delta > 0) {
                    // Fire-and-forget the increment update
                    baseClient.lead.update({
                      where: { id: leadId },
                      data: { leadScore: { increment: delta } },
                    }).catch((err) =>
                      console.error("[Scoring Engine] Failed to update lead score:", err)
                    );
                  }
                })
                .catch((err) =>
                  console.error("[Scoring Engine] Failed to load engine:", err)
                );
            }
          }

          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = global as unknown as { prisma?: ExtendedPrismaClient };

/**
 * Lazily-initialized Prisma client.
 *
 * During Next.js build (collect page data), DATABASE_URL may not be set.
 * We defer the actual connection-string check until the first query,
 * so that API routes can be compiled without a live database.
 */
export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ??
  (() => {
    try {
      const client = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = client;
      }
      return client;
    } catch {
      // Build-time fallback: return a proxy that throws on first actual use.
      // This allows Next.js to compile routes that import prisma but don't
      // execute database queries during build (e.g., POST-only API routes).
      return new Proxy({} as ExtendedPrismaClient, {
        get(_target: ExtendedPrismaClient, prop: string | symbol) {
          throw new Error(
            `DATABASE_URL is not set — cannot access prisma.${String(prop)} during build`
          );
        },
      });
    }
  })();

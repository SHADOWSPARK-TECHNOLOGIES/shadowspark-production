import { NextResponse } from "next/server";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { logger } from "@/lib/logger";
import { requireAuthContext } from "@/lib/api/auth-context";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  targetUrl: z.string().url(),
});

const targetSchema = z.object({
  companyName: z.string().nullable(),
  founderNames: z.array(z.string()).nullable(),
  coreProduct: z.string().nullable(),
  pricingTiers: z.array(z.string()).nullable(),
  contactEmails: z.array(z.string()).nullable(),
});

type TargetExtraction = z.infer<typeof targetSchema>;

interface FirecrawlExtractionResult {
  success?: boolean;
  extract?: unknown;
  error?: string;
}

interface FirecrawlClient {
  scrape: (
    url: string,
    options: {
      formats: string[];
      extract: {
        schema: typeof targetSchema;
        prompt: string;
      };
    }
  ) => Promise<FirecrawlExtractionResult>;
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized", code: 401 },
    { status: 401 }
  );
}

async function validateScrapeAuthorization(request: Request): Promise<boolean> {
  const configuredApiKey = process.env.SNIPER_SCRAPE_API_KEY?.trim() ?? "";
  const providedApiKey = request.headers.get("x-api-key")?.trim() ?? "";
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (configuredApiKey && (providedApiKey === configuredApiKey || bearerToken === configuredApiKey)) {
    return true;
  }

  const authResult = await requireAuthContext(request);
  return authResult.ok;
}

export async function POST(request: Request) {
  try {
    const authorized = await validateScrapeAuthorization(request);
    if (!authorized) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { targetUrl } = requestSchema.parse(body);

    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: "Service unavailable", code: 503 },
        { status: 503 }
      );
    }

    const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }) as unknown as FirecrawlClient;

    const scrapeResult = await app.scrape(targetUrl, {
      formats: ["extract"],
      extract: {
        schema: targetSchema,
        prompt:
          "Extract the core business intelligence from this page. Identify the company name, key founders, main software product, pricing tiers, and any contact emails. Return null if a field is not found on the page.",
      },
    });

    if (!scrapeResult.success) {
      throw new Error(`Firecrawl Error: ${scrapeResult.error ?? "unknown error"}`);
    }

    const extractedData: TargetExtraction = targetSchema.parse(scrapeResult.extract);

    logger.info({ targetUrl }, "sniper scrape completed");

    return NextResponse.json(
      {
        data: extractedData,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          code: 400,
        },
        { status: 400 }
      );
    }

    logger.error({ err: error }, "sniper scrape failed");
    return NextResponse.json(
      {
        error: "Internal Server Error",
        code: 500,
      },
      { status: 500 }
    );
  }
}

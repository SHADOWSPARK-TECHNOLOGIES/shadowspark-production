import { optionalEnv, requireEnv } from "@/lib/env";

export type FirecrawlDocumentMetadata = {
  url?: string;
  title?: string;
  ogUrl?: string;
  ogTitle?: string;
  [key: string]: unknown;
};

export type FirecrawlDocument = {
  markdown?: string;
  html?: string;
  metadata?: FirecrawlDocumentMetadata;
  [key: string]: unknown;
};

export type FirecrawlCrawlJob = {
  id: string;
  status: "scraping" | "completed" | "failed" | "cancelled";
  total: number;
  completed: number;
  next?: string | null;
  data: FirecrawlDocument[];
};

export type FirecrawlScrapeOptions = {
  formats?: Array<"markdown" | "html" | "rawHtml" | "links" | "images" | "screenshot" | "summary" | "changeTracking" | "json" | "attributes" | "branding" | "audio">;
  onlyMainContent?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
};

export type FirecrawlCrawlOptions = {
  prompt?: string | null;
  excludePaths?: string[] | null;
  includePaths?: string[] | null;
  maxDiscoveryDepth?: number | null;
  sitemap?: "skip" | "include" | "only";
  ignoreQueryParameters?: boolean;
  deduplicateSimilarURLs?: boolean;
  limit?: number | null;
  crawlEntireDomain?: boolean;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  delay?: number | null;
  maxConcurrency?: number | null;
  webhook?: string | { url: string; headers?: Record<string, string>; metadata?: Record<string, string>; events?: string[] } | null;
  scrapeOptions?: FirecrawlScrapeOptions | null;
  regexOnFullURL?: boolean;
  zeroDataRetention?: boolean;
  integration?: string;
  origin?: string;
};

type CrawlWaiterControls = {
  pollInterval?: number;
  timeout?: number; // seconds
};

type StartCrawlResponse = { success: boolean; id: string; url: string; error?: string };
type CrawlStatusResponse = {
  success: boolean;
  status: FirecrawlCrawlJob["status"];
  completed?: number;
  total?: number;
  next?: string | null;
  data?: FirecrawlDocument[];
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function joinUrl(baseUrl: string, maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith("/")) return `${baseUrl}${maybeRelative}`;
  return `${baseUrl}/${maybeRelative}`;
}

export class FirecrawlClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(opts?: { apiKey?: string; apiUrl?: string }) {
    const apiUrl = (opts?.apiUrl ?? optionalEnv("FIRECRAWL_API_URL") ?? "https://api.firecrawl.dev").replace(/\/$/, "");
    this.apiUrl = apiUrl;
    // Cloud API requires an API key. For self-hosted, users can omit.
    const isCloud = apiUrl.includes("api.firecrawl.dev");
    this.apiKey = opts?.apiKey ?? (isCloud ? requireEnv("FIRECRAWL_API_KEY") : (optionalEnv("FIRECRAWL_API_KEY") ?? ""));
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(joinUrl(this.apiUrl, path), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Firecrawl POST ${path} failed: ${res.status} ${text}`.trim());
    }
    return (await res.json()) as T;
  }

  private async getJson<T>(pathOrUrl: string): Promise<T> {
    const url = joinUrl(this.apiUrl, pathOrUrl);
    const res = await fetch(url, { method: "GET", headers: this.headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Firecrawl GET ${pathOrUrl} failed: ${res.status} ${text}`.trim());
    }
    return (await res.json()) as T;
  }

  async startCrawl(url: string, options: FirecrawlCrawlOptions = {}): Promise<{ id: string; url: string }> {
    const payload: Record<string, unknown> = { url: url.trim(), ...options };
    // Keep parity with the SDK: always identify origin in the request body.
    if (!payload.origin) payload.origin = "shadowspark";
    const res = await this.postJson<StartCrawlResponse>("/v2/crawl", payload);
    if (!res.success) throw new Error(res.error || "Firecrawl startCrawl failed");
    return { id: res.id, url: res.url };
  }

  async getCrawlStatus(jobId: string): Promise<FirecrawlCrawlJob> {
    const res = await this.getJson<CrawlStatusResponse>(`/v2/crawl/${jobId}`);
    if (!res.success) throw new Error(res.error || "Firecrawl getCrawlStatus failed");
    return {
      id: jobId,
      status: res.status,
      completed: res.completed ?? 0,
      total: res.total ?? 0,
      next: res.next ?? null,
      data: res.data ?? [],
    };
  }

  private async fetchAllPages(nextUrl: string, initial: FirecrawlDocument[], maxResults?: number): Promise<FirecrawlDocument[]> {
    const docs = initial.slice();
    let current: string | null = nextUrl;
    while (current) {
      const page: { success: boolean; next?: string | null; data?: FirecrawlDocument[] } =
        await this.getJson<{ success: boolean; next?: string | null; data?: FirecrawlDocument[] }>(current);
      if (!page.success) break;
      for (const d of page.data ?? []) {
        if (maxResults != null && docs.length >= maxResults) break;
        docs.push(d);
      }
      if (maxResults != null && docs.length >= maxResults) break;
      current = page.next ?? null;
    }
    return docs;
  }

  /**
   * Convenience waiter: start a crawl and poll until it finishes.
   */
  async crawl(rootUrl: string, req: (FirecrawlCrawlOptions & CrawlWaiterControls) = {}): Promise<FirecrawlCrawlJob> {
    const pollIntervalSeconds = req.pollInterval ?? 2;
    const timeoutSeconds = req.timeout;

    // Strip waiter controls before sending to API.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pollInterval, timeout, ...options } = req;

    const started = await this.startCrawl(rootUrl, options);
    const startedAt = Date.now();

    while (true) {
      const status = await this.getCrawlStatus(started.id);
      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
        if (status.next) {
          status.data = await this.fetchAllPages(status.next, status.data, typeof options.limit === "number" ? options.limit : undefined);
          status.next = null;
        }
        return status;
      }

      if (timeoutSeconds != null && (Date.now() - startedAt) / 1000 > timeoutSeconds) {
        throw new Error(`Firecrawl crawl timeout after ${timeoutSeconds}s (jobId=${started.id})`);
      }
      await sleep(Math.max(1000, pollIntervalSeconds * 1000));
    }
  }
}

let cached: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (cached) return cached;
  cached = new FirecrawlClient();
  return cached;
}

export function clearFirecrawlCache(): void {
  cached = null;
}

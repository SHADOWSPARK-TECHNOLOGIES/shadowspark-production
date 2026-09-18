const ALLOWED_ORIGINS = [
  "https://shadowspark-dashboard.vercel.app",
  "https://shadowspark-production.netlify.app",
  "https://app.shadowspark.tech",
  "http://localhost:3000",
];

const PREVIEW_REGEX = /^https:\/\/(shadowspark-[a-z0-9-]+--shadowspark-production\.netlify\.app|deploy-preview-\d+--shadowspark-production\.netlify\.app|shadowspark-[a-z0-9-]+\.vercel\.app)$/;

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin) || PREVIEW_REGEX.test(origin)) {
    return origin;
  }
  return null;
}

export function corsHeaders(
  request: Request,
  methods = "GET, POST, OPTIONS",
): Record<string, string> {
  const allowed = getAllowedOrigin(request);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Tenant-ID, Idempotency-Key",
  };
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = allowed;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function handleCorsPreflight(
  request: Request,
  methods = "GET, POST, OPTIONS",
): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, methods),
  });
}

export function withCors(
  response: Response,
  request: Request,
  methods = "GET, POST, OPTIONS",
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, methods))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

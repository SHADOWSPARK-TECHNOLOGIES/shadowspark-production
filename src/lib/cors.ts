const ALLOWED_ORIGINS = [
  "https://app.shadowspark.tech",
  "https://shadowspark-production.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

export function corsHeaders(request: Request, methods = "GET, POST, OPTIONS"): HeadersInit {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(request),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-ID, Idempotency-Key",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsPreflight(request: Request, methods = "GET, POST, OPTIONS"): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, methods) });
}

export function withCors(response: Response, request: Request, methods = "GET, POST, OPTIONS"): Response {
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

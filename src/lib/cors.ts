import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://app.shadowspark-techologies.online",
  "https://app.shadowspark-technologies.online",
];

function getAllowedOrigins(): Set<string> {
  const configuredOrigins =
    process.env.CORS_ALLOWED_ORIGINS
      ?.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? [];

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
}

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  return getAllowedOrigins().has(origin) ? origin : null;
}

function getCorsHeaders(origin: string, methods: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function withCors(response: NextResponse, request: Request, methods: string): NextResponse {
  const origin = getAllowedOrigin(request);
  if (!origin) {
    return response;
  }

  const headers = getCorsHeaders(origin, methods);
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

export function handleCorsPreflight(request: Request, methods: string): NextResponse {
  const origin = getAllowedOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin, methods),
  });
}

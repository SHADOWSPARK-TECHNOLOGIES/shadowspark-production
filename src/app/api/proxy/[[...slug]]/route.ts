import { NextResponse } from "next/server";

const BACKEND_API_URL = process.env.BACKEND_API_URL;

async function proxy(request: Request, method: string, slug?: string[]) {
  if (!BACKEND_API_URL) {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Backend temporarily unavailable" } },
      { status: 503 }
    );
  }

  try {
    const url = new URL(BACKEND_API_URL);
    url.pathname = `/${slug?.join("/") ?? ""}`;
    url.search = new URL(request.url).search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("content-encoding");

    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      duplex: method === "GET" || method === "HEAD" ? undefined : "half",
    } as RequestInit & { duplex?: "half" });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Backend temporarily unavailable" } },
      { status: 503 }
    );
  }
}

export async function GET(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return proxy(request, "GET", (await context.params).slug);
}
export async function POST(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return proxy(request, "POST", (await context.params).slug);
}
export async function PATCH(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return proxy(request, "PATCH", (await context.params).slug);
}
export async function DELETE(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return proxy(request, "DELETE", (await context.params).slug);
}

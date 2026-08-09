import { handleCorsPreflight, withCors } from "@/lib/cors";
import { successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";

const METHODS = "GET, OPTIONS";

export async function GET(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);
  return withCors(successResponse({ ocrData: {} }), request, METHODS);
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { successResponse } from "@/lib/api/http";
import { requireAuthContext } from "@/lib/api/auth-context";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  const authResult = await requireAuthContext(request);
  if (!authResult.ok) return withCors(authResult.response, request, METHODS);
  return withCors(successResponse({ assigned: true }), request, METHODS);
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { loginWithPassword, validateLoginInput } from "@/lib/api/v1/auth-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validateLoginInput(payload);
    const result = await loginWithPassword(input);
    return withCors(successResponse(result), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"), request, METHODS);
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return withCors(errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Login failed"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

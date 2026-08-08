import { ZodError } from "zod";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { registerTenantAdmin, validateRegisterInput } from "@/lib/api/v1/auth-service";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validateRegisterInput(payload);
    const result = await registerTenantAdmin(input);
    return withCors(successResponse(result, 201), request, METHODS);
  } catch (error) {
    if (error instanceof ZodError) {
      return withCors(errorResponse(400, "INVALID_BODY", error.issues[0]?.message ?? "Invalid request body"), request, METHODS);
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return withCors(errorResponse(403, "EMAIL_CONFLICT", "Email is already registered"), request, METHODS);
    }

    return withCors(errorResponse(500, "INTERNAL_ERROR", "Registration failed"), request, METHODS);
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

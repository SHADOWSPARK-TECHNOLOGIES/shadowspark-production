export const dynamic = "force-dynamic";

import { handleCorsPreflight, withCors } from "@/lib/cors";
import { errorResponse, successResponse } from "@/lib/api/http";
import { provisionTrialTenantCore } from "@/app/actions/sandbox";

const METHODS = "POST, OPTIONS";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const parsed = await request.json();
        if (parsed && typeof parsed === "object") {
          body = parsed as Record<string, unknown>;
        }
      } catch {
        return withCors(
          errorResponse(400, "INVALID_JSON", "Request body must be valid JSON"),
          request,
          METHODS
        );
      }
    }

    const result = await provisionTrialTenantCore({
      institutionSlug: typeof body.institutionSlug === "string" ? body.institutionSlug : undefined,
      companyName: typeof body.companyName === "string" ? body.companyName : undefined,
      operatorEmail: typeof body.operatorEmail === "string" ? body.operatorEmail : undefined,
      operatorName: typeof body.operatorName === "string" ? body.operatorName : undefined,
      operatorPassword: typeof body.operatorPassword === "string" ? body.operatorPassword : undefined,
    });

    return withCors(successResponse({ success: true, data: result }, 201), request, METHODS);
  } catch (error: unknown) {
    const err = error as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof err?.status === "number" && typeof err?.code === "string") {
      return withCors(
        errorResponse(
          err.status,
          err.code,
          typeof err?.message === "string" ? err.message : "Failed to provision trial tenant"
        ),
        request,
        METHODS
      );
    }
    return withCors(
      errorResponse(
        500,
        "PROVISIONING_FAILED",
        error instanceof Error ? error.message : "Failed to provision trial tenant"
      ),
      request,
      METHODS
    );
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, METHODS);
}

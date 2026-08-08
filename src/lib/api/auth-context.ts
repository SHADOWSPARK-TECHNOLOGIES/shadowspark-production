import { errorResponse } from "@/lib/api/http";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth";
import { resolveTenantIdFromRequest } from "@/lib/tenant";

export interface RequestAuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

type AuthResult =
  | { ok: true; context: RequestAuthContext }
  | { ok: false; response: ReturnType<typeof errorResponse> };

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function toRequestAuthContext(payload: AuthTokenPayload, tenantId: string): RequestAuthContext {
  return {
    userId: payload.sub,
    tenantId,
    role: payload.role,
    email: payload.email,
  };
}

export async function requireAuthContext(request: Request): Promise<AuthResult> {
  const token = parseBearerToken(request);
  if (!token) {
    return { ok: false, response: errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header") };
  }

  let payload: AuthTokenPayload;
  try {
    payload = await verifyAuthToken(token);
  } catch {
    return { ok: false, response: errorResponse(401, "UNAUTHORIZED", "Invalid or expired token") };
  }

  try {
    const tenantId = await resolveTenantIdFromRequest(request, payload);
    return { ok: true, context: toRequestAuthContext(payload, tenantId) };
  } catch (error) {
    if (error instanceof Error && error.message === "TENANT_MISMATCH") {
      return {
        ok: false,
        response: errorResponse(
          403,
          "TENANT_MISMATCH",
          "Tenant slug does not match authenticated session"
        ),
      };
    }
    return { ok: false, response: errorResponse(403, "FORBIDDEN", "Tenant access denied") };
  }
}

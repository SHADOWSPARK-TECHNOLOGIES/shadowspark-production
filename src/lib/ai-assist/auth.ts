import { randomUUID } from "node:crypto";

import { optionalEnv } from "@/lib/env";

import { AiAssistError } from "./errors";
import type { AiAssistConfig, AiAssistHeadersInput } from "./types";

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Reads AI-ASSIST env via optionalEnv and fails closed when url or token is missing.
 * Never logs or returns the token.
 */
export function getAiAssistConfig(): AiAssistConfig {
  const apiUrl = optionalEnv("AI_ASSIST_API_URL")?.replace(/\/$/, "");
  const apiToken = optionalEnv("AI_ASSIST_API_TOKEN");
  if (!apiUrl || !apiToken) {
    throw new AiAssistError("AI-ASSIST is not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const timeoutRaw = optionalEnv("AI_ASSIST_TIMEOUT_MS");
  const parsed = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;

  return { apiUrl, apiToken, timeoutMs };
}

/**
 * Server-side upstream headers only. Never copies browser Authorization or X-Tenant-Slug.
 * X-Tenant-ID is always the JWT-resolved tenant passed in by the caller.
 */
export function buildAiAssistHeaders(input: AiAssistHeadersInput): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.token}`,
  };
  if (input.tenantId) {
    headers["X-Tenant-ID"] = input.tenantId;
  }
  if (input.requestId) {
    headers["X-Request-ID"] = input.requestId;
  }
  if (input.json) {
    headers["Content-Type"] = "application/json";
  }
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }
  return headers;
}

/** Reuse inbound X-Request-ID when present; otherwise mint a UUID. */
export function resolveRequestId(request: Request): string {
  const inbound = request.headers.get("x-request-id")?.trim();
  return inbound || randomUUID();
}

/** Require Idempotency-Key from the client for mutations (forwarded upstream; no Redis wrap). */
export function readIdempotencyKey(request: Request): string | null {
  const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
  return key.length > 0 ? key : null;
}

const JSON_CONTENT_TYPE = "application/json";
const MAX_RETRY_ATTEMPTS = 2;

export interface RequestConfig {
  headers?: HeadersInit;
  retry?: boolean;
  idempotencyKey?: string;
}

async function parseResponseBody(response: Response): Promise<unknown | null> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(JSON_CONTENT_TYPE)) {
    const text = await response.text();
    return text.trim().length > 0 ? text : null;
  }

  const text = await response.text();
  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getTenantHint(): string | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage.getItem("tenantSlug") ?? undefined;
}

/** This is a routing hint only. The backend MUST derive the authoritative tenant from the JWT session. */
function buildHeaders(config?: RequestConfig, mutation = false): Headers {
  const headers = new Headers(config?.headers);
  const tenantHint = getTenantHint();
  if (tenantHint) {
    headers.set("X-Tenant-Slug", tenantHint);
  }
  if (mutation && config?.idempotencyKey) {
    headers.set("Idempotency-Key", config.idempotencyKey);
  }
  return headers;
}

async function request<T>(input: RequestInfo | URL, init: RequestInit, config?: RequestConfig): Promise<T | null> {
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = config?.retry !== false && (method === "GET" || method === "HEAD");
  const attempts = canRetry ? MAX_RETRY_ATTEMPTS : 1;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      const body = await parseResponseBody(response);
      if (!response.ok) {
        throw new Error(typeof body === "object" && body && "error" in body ? JSON.stringify(body) : response.statusText);
      }
      return body as T | null;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed");
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Request failed");
}

export const api = {
  get<T>(url: string, config?: RequestConfig) {
    return request<T>(url, { method: "GET", headers: buildHeaders(config) }, config);
  },
  post<T>(url: string, body?: unknown, config?: RequestConfig) {
    return request<T>(
      url,
      {
        method: "POST",
        headers: buildHeaders(config, true),
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      config
    );
  },
  patch<T>(url: string, body?: unknown, config?: RequestConfig) {
    return request<T>(
      url,
      {
        method: "PATCH",
        headers: buildHeaders(config, true),
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      config
    );
  },
  delete<T>(url: string, config?: RequestConfig) {
    return request<T>(url, { method: "DELETE", headers: buildHeaders(config, true) }, config);
  },
};

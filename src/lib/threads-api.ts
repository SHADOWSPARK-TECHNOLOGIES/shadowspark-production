import { optionalEnv } from "@/lib/env";

type ThreadsMedia = {
  media_url?: string;
  media_type?: "IMAGE" | "VIDEO";
};

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (response.status < 500 && response.status !== 429) return response;
      lastError = new Error(`Threads API transient failure (${response.status})`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await delay(300 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Threads API request failed");
}

async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
  const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetchWithRetry(tokenUrl.toString(), { method: "GET" });
  const data = (await response.json()) as { access_token?: string; error?: { message?: string } };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || "Failed to obtain Threads access token");
  }

  return data.access_token;
}

export async function createThreadsPost(text: string, media?: ThreadsMedia) {
  const appId = optionalEnv("THREADS_APP_ID");
  const appSecret = optionalEnv("THREADS_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("Missing Threads app credentials");
  }

  const token = await getAppAccessToken(appId, appSecret);
  const response = await fetchWithRetry("https://graph.threads.net/v1.0/me/threads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
      media_url: media?.media_url,
      media_type: media?.media_type,
    }),
  });

  const data = (await response.json()) as { id?: string; post_id?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to publish Threads post");
  }

  return { post_id: data.post_id ?? data.id };
}

export async function getThreadsInsights() {
  const appId = optionalEnv("THREADS_APP_ID");
  const appSecret = optionalEnv("THREADS_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("Missing Threads app credentials");
  }

  const token = await getAppAccessToken(appId, appSecret);
  const response = await fetchWithRetry("https://graph.threads.net/v1.0/me/threads_insights", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error("Failed to fetch Threads insights");
  }

  return data;
}

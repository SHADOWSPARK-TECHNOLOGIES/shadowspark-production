import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

describe("Proxy API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("authentication guard (C3)", () => {
    it("rejects unauthenticated GET with 401", async () => {
      mocks.auth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/proxy/[[...slug]]/route");
      const request = new Request("http://localhost:3000/api/proxy/v1/tenant");
      const response = await GET(request, { params: Promise.resolve({ slug: ["v1", "tenant"] }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated POST with 401", async () => {
      mocks.auth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/proxy/[[...slug]]/route");
      const request = new Request("http://localhost:3000/api/proxy/v1/messages/send", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
      });
      const response = await POST(request, { params: Promise.resolve({ slug: ["v1", "messages", "send"] }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects session without user id with 401", async () => {
      mocks.auth.mockResolvedValue({ user: {} });

      const { GET } = await import("@/app/api/proxy/[[...slug]]/route");
      const request = new Request("http://localhost:3000/api/proxy/v1/tenant");
      const response = await GET(request, { params: Promise.resolve({ slug: ["v1", "tenant"] }) });

      expect(response.status).toBe(401);
    });

    it("returns 503 when authenticated but BACKEND_API_URL is unset", async () => {
      mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "admin" } });

      const { GET } = await import("@/app/api/proxy/[[...slug]]/route");
      const request = new Request("http://localhost:3000/api/proxy/v1/tenant");
      const response = await GET(request, { params: Promise.resolve({ slug: ["v1", "tenant"] }) });

      // BACKEND_API_URL is not set in test env → 503
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    });
  });
});

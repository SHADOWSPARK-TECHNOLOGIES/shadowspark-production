import { beforeEach, describe, expect, it, vi } from "vitest";

const mockWorkflowService = vi.hoisted(() => ({
  createWorkflow: vi.fn(),
  createWorkflowSchema: { parse: vi.fn() },
  listWorkflows: vi.fn(),
}));

vi.mock("@/lib/api/v1/workflow-service", () => mockWorkflowService);
vi.mock("@/lib/api/auth-context", () => ({
  requireAuthContext: vi.fn(async () => ({
    ok: true as const,
    context: {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      email: "admin@example.com",
    },
  })),
}));
vi.mock("@/middleware/idempotency", () => ({
  withIdempotency: vi.fn(),
}));
vi.mock("@/lib/cors", () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: vi.fn(),
}));

import { GET } from "@/app/api/v1/workflows/route";

describe("workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a flat success envelope whose data is the workflow array", async () => {
    mockWorkflowService.listWorkflows.mockResolvedValue([
      { id: "workflow-1", name: "KYC Review" },
    ]);

    const response = await GET(new Request("http://localhost/api/v1/workflows"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "workflow-1", name: "KYC Review" }],
    });
  });
});

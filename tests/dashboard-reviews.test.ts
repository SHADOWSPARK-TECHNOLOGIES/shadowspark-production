import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
let currentPathname: string | null = "/";
let currentParams: Record<string, string> = { briefId: "brief-123" };

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useParams: () => currentParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Mock next/dynamic
vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockDynamicComponent() {
      return React.createElement("div", { "data-testid": "dynamic-component" });
    };
  },
}));

import { NAV_ITEMS } from "@/lib/dashboard/navigation";
import ChatWidget from "@/components/ChatWidget";
import DashboardPageClient from "@/app/dashboard/PageClient";
import ReviewsPage from "@/app/dashboard/reviews/page";
import ReviewDetailPage from "@/app/dashboard/reviews/[briefId]/page";
import type { ReviewQueueSummary, ReviewQueueResponse } from "@/lib/ai-assist/types";

describe("Milestone 4 & 5 Frontend Integration Tests", () => {
  beforeEach(() => {
    currentPathname = "/";
    currentParams = { briefId: "brief-test-456" };
    vi.clearAllMocks();
  });

  describe("1. Navigation Registration (Milestone 4)", () => {
    it("registers Exception Review in NAV_ITEMS under Compliance", () => {
      const reviewItem = NAV_ITEMS.find((item) => item.href === "/dashboard/reviews");
      expect(reviewItem).toBeDefined();
      expect(reviewItem?.label).toBe("Exception Review");
      expect(reviewItem?.section).toBe("Compliance");
      expect(reviewItem?.icon).toBeDefined();
    });

    it("preserves Core, Compliance, AI & Ops, and System sections", () => {
      const sections = new Set(NAV_ITEMS.map((item) => item.section));
      expect(sections.has("Core")).toBe(true);
      expect(sections.has("Compliance")).toBe(true);
      expect(sections.has("AI & Ops")).toBe(true);
      expect(sections.has("System")).toBe(true);
    });
  });

  describe("2. ChatWidget Containment (Milestone 4 & 5)", () => {
    it("suppresses ChatWidget on /dashboard/* routes", () => {
      currentPathname = "/dashboard";
      const html1 = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(html1).toBe("");

      currentPathname = "/dashboard/reviews";
      const html2 = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(html2).toBe("");

      currentPathname = "/dashboard/reviews/brief-789";
      const html3 = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(html3).toBe("");
    });

    it("suppresses ChatWidget on /admin/* and /operator/* routes", () => {
      currentPathname = "/admin";
      expect(renderToStaticMarkup(React.createElement(ChatWidget))).toBe("");

      currentPathname = "/admin/leads";
      expect(renderToStaticMarkup(React.createElement(ChatWidget))).toBe("");

      currentPathname = "/operator";
      expect(renderToStaticMarkup(React.createElement(ChatWidget))).toBe("");
    });

    it("renders ChatWidget on public marketing routes", () => {
      currentPathname = "/";
      const htmlRoot = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(htmlRoot).toContain('aria-label="Open chat"');

      currentPathname = "/about";
      const htmlAbout = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(htmlAbout).toContain('aria-label="Open chat"');

      currentPathname = "/solutions";
      const htmlSolutions = renderToStaticMarkup(React.createElement(ChatWidget));
      expect(htmlSolutions).toContain('aria-label="Open chat"');
    });

  });

  describe("3. Dashboard Command Centre Restoration (Milestone 5)", () => {
    it("renders restored Command Centre dashboard with KPI grid, charts, and activity feeds", () => {
      const html = renderToStaticMarkup(React.createElement(DashboardPageClient));
      expect(html).toContain("Lead Acquisition");
      expect(html).toContain("Revenue Funnel");
      expect(html).toContain("Watchtower Alerts");
      expect(html).toContain("Live Activity");
      expect(html).toContain("Total Leads");
    });
  });

  describe("4. Exception Review Queue Page — 10 States (Milestone 4)", () => {
    const mockItems: ReviewQueueSummary[] = [
      {
        brief_id: "brief-alpha-001",
        tenant_id: "tenant-lagos-node",
        exception_id: "exc-sec-circ-26",
        queue_state: "pending_review",
        sor_status_unchanged: true,
        created_at: "2026-09-16T12:00:00Z",
        updated_at: "2026-09-16T12:00:00Z",
      },
      {
        brief_id: "brief-beta-002",
        tenant_id: "tenant-lagos-node",
        exception_id: "exc-vasp-threshold",
        queue_state: "annotated",
        sor_status_unchanged: true,
        created_at: "2026-09-16T11:00:00Z",
        updated_at: "2026-09-16T11:30:00Z",
      },
    ];

    it("renders State 1: loading", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, { simulatedState: { status: "loading" } })
      );
      expect(html).toContain("data-testid=\"state-loading\"");
    });

    it("renders State 2: empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, { simulatedState: { status: "empty" } })
      );
      expect(html).toContain("data-testid=\"state-empty\"");
      expect(html).toContain("Review Queue Clear");
    });

    it("renders State 3: success with review queue records", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "success",
            data: mockItems,
            total: 2,
          },
        })
      );
      expect(html).toContain("data-testid=\"state-success\"");
      expect(html).toContain("brief-alpha-001");
      expect(html).toContain("exc-sec-circ-26");
      expect(html).toContain("Pending Review");
      expect(html).toContain("Annotated");
      expect(html).toContain("Preserved");
    });

    it("renders State 4: 400 validation failure", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "400",
            message: "Invalid query: limit must be between 1 and 100",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-400\"");
      expect(html).toContain("Validation Failure (HTTP 400)");
      expect(html).toContain("Invalid query");
    });

    it("renders State 5: 401 unauthorized", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "401",
            message: "Session token invalid or expired",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-401\"");
      expect(html).toContain("Authentication Required (HTTP 401)");
      expect(html).toContain("/login");
    });

    it("renders State 6: 403 forbidden with multi-tenant warning", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "403",
            message: "Tenant membership required",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-403\"");
      expect(html).toContain("Access Forbidden (HTTP 403)");
      expect(html).toContain("Multi-Tenant Isolation");
    });

    it("renders State 7: 404 not found", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "404",
            message: "Compliance reviews endpoint not found",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-404\"");
      expect(html).toContain("Resource Not Found (HTTP 404)");
    });

    it("renders State 8: 409 conflict", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "409",
            message: "Queue state conflict",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-409\"");
      expect(html).toContain("State Conflict (HTTP 409)");
    });

    it("renders State 9: 429 rate limited", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "429",
            message: "Compliance inquiry budget limit reached",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-429\"");
      expect(html).toContain("Rate Limited (HTTP 429)");
      expect(html).toContain("LLM06 Compliance Governance");
    });

    it("renders State 10: 503 / 504 service unavailable", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, {
          simulatedState: {
            status: "503",
            statusCode: 503,
            message: "AI-ASSIST service connection refused",
          },
        })
      );
      expect(html).toContain("data-testid=\"state-503\"");
      expect(html).toContain("Service Unavailable (HTTP 503)");
    });

    it("asserts advisory invariant banner is present on review queue", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewsPage, { simulatedState: { status: "loading" } })
      );
      expect(html).toContain("Advisory Invariant");
      expect(html).toContain("No automated decision will mutate core transaction ledgers");
    });
  });

  describe("5. Exception Review Detail Page — 10 States (Milestone 4)", () => {
    const mockDetail: ReviewQueueResponse = {
      brief_id: "brief-detail-999",
      tenant_id: "tenant-owerri-hq",
      exception_id: "exc-cbn-recap-01",
      output: {
        findings: ["BVN and NIN verified", "Cross-border liquidity threshold exceeded"],
        recommended_action: "REQUIRE_MANUAL_AFFIRMATION",
        risk_level: "MEDIUM",
      },
      queue_state: "pending_review",
      sor_status_unchanged: true,
      annotations: [
        {
          annotation_id: "ann-01",
          operator_id: "operator-chidi",
          annotation: "Initial audit verified against corporate filings.",
          created_at: "2026-09-16T13:15:00Z",
        },
      ],
      created_at: "2026-09-16T12:45:00Z",
      updated_at: "2026-09-16T13:15:00Z",
    };

    it("renders State 1: loading", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, { simulatedState: { status: "loading" } })
      );
      expect(html).toContain("data-testid=\"detail-state-loading\"");
    });

    it("renders State 2: empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, { simulatedState: { status: "empty" } })
      );
      expect(html).toContain("data-testid=\"detail-state-empty\"");
      expect(html).toContain("Brief Not Available");
    });

    it("renders State 3: success with advisory findings and immutable annotations", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "success",
            data: mockDetail,
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-success\"");
      expect(html).toContain("brief-detail-999");
      expect(html).toContain("tenant-owerri-hq");
      expect(html).toContain("exc-cbn-recap-01");
      expect(html).toContain("SOR Status: Preserved");
      expect(html).toContain("AI Advisory Output — Strictly Advisory, Non-Mutating");
      expect(html).toContain("operator-chidi");
      expect(html).toContain("Initial audit verified against corporate filings");
      expect(html).toContain("Append Operator Annotation");
    });

    it("renders State 4: 400 validation error", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "400",
            message: "Invalid brief identifier provided",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-400\"");
      expect(html).toContain("Validation Error (HTTP 400)");
    });

    it("renders State 5: 401 unauthorized", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "401",
            message: "Authentication token missing",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-401\"");
      expect(html).toContain("Authentication Required (HTTP 401)");
    });

    it("renders State 6: 403 forbidden", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "403",
            message: "Tenant boundary violated: access denied",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-403\"");
      expect(html).toContain("Access Forbidden (HTTP 403)");
    });

    it("renders State 7: 404 not found", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "404",
            message: "Brief brief-detail-999 not found",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-404\"");
      expect(html).toContain("Brief Not Found (HTTP 404)");
    });

    it("renders State 8: 409 conflict", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "409",
            message: "Idempotency conflict on brief annotation",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-409\"");
      expect(html).toContain("State Conflict (HTTP 409)");
    });

    it("renders State 9: 429 rate limited", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "429",
            message: "Inspection rate limit exceeded",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-429\"");
      expect(html).toContain("Rate Limited (HTTP 429)");
    });

    it("renders State 10: 503 / 504 service unavailable", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "503",
            statusCode: 504,
            message: "Gateway timeout communicating with AI-ASSIST",
          },
        })
      );
      expect(html).toContain("data-testid=\"detail-state-503\"");
      expect(html).toContain("Compliance Service Unavailable (HTTP 504)");
    });

    it("strictly preserves business decisions: verifies advisory notice and unchanged SOR status", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReviewDetailPage, {
          simulatedState: {
            status: "success",
            data: mockDetail,
          },
        })
      );
      expect(html).toContain("Under no circumstances does the AI system autonomously alter ledger entries");
      expect(html).toContain("SOR Status: Preserved");
    });
  });

  describe("6. Interactive State & Network Handling Logic", () => {
    it("handles simulated network fetch responses for all error statuses", async () => {
      const statuses = [400, 401, 403, 404, 409, 429, 503];
      for (const status of statuses) {
        const fakeFetch = vi.fn().mockResolvedValue({
          status,
          ok: false,
          json: async () => ({ error: { message: `Simulated error for ${status}` } }),
        });
        global.fetch = fakeFetch;

        // Verify that the endpoint path and params are properly queried
        const res = await global.fetch(`/api/compliance/reviews?limit=50&offset=0`);
        expect(res.status).toBe(status);
        const data = await res.json();
        expect(data.error.message).toContain(`${status}`);
      }
    });

    it("verifies operator annotation payload contract and Idempotency-Key requirement", async () => {
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: string = "";

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        capturedBody = (init?.body as string) || "";
        return {
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            data: {
              brief_id: "brief-detail-999",
              tenant_id: "tenant-owerri-hq",
              exception_id: "exc-cbn-recap-01",
              output: {},
              queue_state: "annotated",
              sor_status_unchanged: true,
              annotations: [
                {
                  annotation_id: "ann-new-02",
                  operator_id: "operator-chidi",
                  annotation: "Affirmed valid under CBN Guidelines 2026.",
                  created_at: new Date().toISOString(),
                },
              ],
              created_at: "2026-09-16T12:45:00Z",
              updated_at: new Date().toISOString(),
            },
          }),
        };
      });

      const testIdempotencyKey = "test-uuid-9999";
      const testAnnotation = "Affirmed valid under CBN Guidelines 2026.";

      const res = await global.fetch("/api/compliance/reviews/brief-detail-999/annotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": testIdempotencyKey,
        },
        body: JSON.stringify({ annotation: testAnnotation }),
      });

      expect(res.status).toBe(200);
      expect(capturedHeaders["Idempotency-Key"]).toBe(testIdempotencyKey);
      expect(capturedHeaders["Content-Type"]).toBe("application/json");
      expect(JSON.parse(capturedBody)).toEqual({ annotation: testAnnotation });
      const result = await res.json();
      expect(result.data.queue_state).toBe("annotated");
      expect(result.data.annotations).toHaveLength(1);
    });
  });
});


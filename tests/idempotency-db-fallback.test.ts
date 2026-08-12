import { beforeEach, describe, expect, it, vi } from "vitest";

interface StoredIdempotencyRecord {
  tenantId: string;
  key: string;
  statusCode: number;
  response: object;
  expiresAt: Date;
}

const databaseMock = vi.hoisted(() => ({
  record: null as StoredIdempotencyRecord | null,
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ redis: null }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyKey: {
      findUnique: databaseMock.findUnique,
      create: databaseMock.create,
      update: databaseMock.update,
      deleteMany: databaseMock.deleteMany,
    },
  },
}));

import { withIdempotency } from "@/lib/idempotency";

function request(key: string): Request {
  return new Request("https://api.example.invalid/v1/loans", {
    method: "POST",
    headers: { "Idempotency-Key": key },
  });
}

describe("database idempotency fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-enough-entropy");
    databaseMock.record = null;
    databaseMock.findUnique.mockImplementation(async () => databaseMock.record);
    databaseMock.create.mockImplementation(async ({ data }: { data: StoredIdempotencyRecord }) => {
      if (databaseMock.record !== null) {
        throw Object.assign(new Error("unique constraint"), { code: "P2002" });
      }
      databaseMock.record = data;
      return data;
    });
    databaseMock.update.mockImplementation(async ({ data }: { data: Partial<StoredIdempotencyRecord> }) => {
      if (databaseMock.record === null) throw new Error("missing idempotency claim");
      databaseMock.record = { ...databaseMock.record, ...data };
      return databaseMock.record;
    });
    databaseMock.deleteMany.mockImplementation(async () => {
      databaseMock.record = null;
      return { count: 1 };
    });
  });

  it("stores and replays a successful response through the database unique key", async () => {
    const handler = vi.fn(async () =>
      Response.json({ success: true, data: { id: "loan-1" } }, { status: 201 }),
    );

    const first = await withIdempotency(request("loan-create-1"), "tenant-1", handler);
    const second = await withIdempotency(request("loan-create-1"), "tenant-1", handler);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get("Idempotency-Replayed")).toBe("true");
    await expect(second.json()).resolves.toEqual({ success: true, data: { id: "loan-1" } });
    expect(handler).toHaveBeenCalledOnce();
    expect(databaseMock.create).toHaveBeenCalledOnce();
    expect(databaseMock.update).toHaveBeenCalledOnce();
    expect(JSON.stringify(databaseMock.record?.response)).not.toContain("loan-1");
  });

  it("returns an in-progress conflict while the first database claim is running", async () => {
    let completeHandler: (() => void) | undefined;
    const handler = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          completeHandler = () => resolve(Response.json({ success: true }, { status: 201 }));
        }),
    );

    const firstPromise = withIdempotency(request("loan-create-concurrent"), "tenant-1", handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    const second = await withIdempotency(
      request("loan-create-concurrent"),
      "tenant-1",
      handler,
    );

    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toMatchObject({
      success: false,
      error: { code: "IDEMPOTENCY_IN_PROGRESS" },
    });
    expect(handler).toHaveBeenCalledOnce();

    completeHandler?.();
    await expect(firstPromise).resolves.toMatchObject({ status: 201 });
  });
});

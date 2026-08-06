import { describe, expect, it, vi, afterEach } from "vitest";
import fs from "node:fs/promises";

import { cosineSimilarity } from "@/lib/rag/retrieve";
import { loadRagIndex } from "@/lib/rag/store";

vi.mock("node:fs/promises");

describe("rag math", () => {
  it("cosineSimilarity is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it("cosineSimilarity is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("throws on mismatched dimensions", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(/dimension mismatch/);
  });
});

describe("rag store", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loadRagIndex returns parsed JSON when file exists", async () => {
    const mockData = { version: 1, chunks: [] };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));

    const result = await loadRagIndex("/fake/path.json");
    expect(result).toEqual(mockData);
    expect(fs.readFile).toHaveBeenCalledWith("/fake/path.json", "utf8");
  });

  it("loadRagIndex returns null when file reading fails", async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));

    const result = await loadRagIndex("/fake/path.json");
    expect(result).toBeNull();
  });
  
  it("loadRagIndex returns null when JSON is invalid", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce("invalid-json");

    const result = await loadRagIndex("/fake/path.json");
    expect(result).toBeNull();
  });
});


import fs from "node:fs/promises";
import path from "node:path";

import type { RagEmbeddingIndex } from "@/lib/rag/types";

export const DEFAULT_INDEX_PATH = path.join(process.cwd(), "data", "rag", "index.json");

export async function loadRagIndex(indexPath: string = DEFAULT_INDEX_PATH): Promise<RagEmbeddingIndex | null> {
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    return JSON.parse(raw) as RagEmbeddingIndex;
  } catch {
    return null;
  }
}

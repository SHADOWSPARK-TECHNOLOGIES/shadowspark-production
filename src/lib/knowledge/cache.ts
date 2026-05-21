const DEFAULT_TTL_MS = 3600 * 1000;
const DEFAULT_MAX_ENTRIES = 100;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function normalizeKnowledgeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export class InMemoryLruCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  get(rawKey: string): T | null {
    const key = normalizeKnowledgeQuery(rawKey);
    if (!key) return null;

    const entry = this.entries.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(rawKey: string, value: T): void {
    const key = normalizeKnowledgeQuery(rawKey);
    if (!key) return;

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) break;
      this.entries.delete(oldestKey);
    }
  }
}

export const competitiveContextCache = new InMemoryLruCache<string>();
export const semanticSearchCache = new InMemoryLruCache<{ results: string[]; limit: number }>();

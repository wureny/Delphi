export interface CacheLookupResult<T> {
  status: "miss" | "fresh" | "stale";
  value?: T;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

export class MemoryTtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  get(key: string, now: number = Date.now()): CacheLookupResult<T> {
    const entry = this.entries.get(key);

    if (!entry) {
      return { status: "miss" };
    }

    if (entry.expiresAt > now) {
      return {
        status: "fresh",
        value: structuredClone(entry.value),
      };
    }

    if (entry.staleUntil > now) {
      return {
        status: "stale",
        value: structuredClone(entry.value),
      };
    }

    this.entries.delete(key);
    return { status: "miss" };
  }

  set(
    key: string,
    value: T,
    ttlMs: number,
    staleIfErrorTtlMs: number,
    now: number = Date.now(),
  ): void {
    this.entries.set(key, {
      value: structuredClone(value),
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + staleIfErrorTtlMs,
    });
  }
}

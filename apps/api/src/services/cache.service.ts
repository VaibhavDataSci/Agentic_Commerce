interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttlSeconds = 60): void {
    // Evict oldest if cache gets too large (simple max capacity 200 items)
    if (this.cache.size >= 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new MemoryCacheService();

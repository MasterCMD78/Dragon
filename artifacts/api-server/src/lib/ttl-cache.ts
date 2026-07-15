/**
 * Minimal in-process TTL cache for expensive read-heavy aggregation queries
 * (leaderboards, public content lists) that don't need to be perfectly
 * real-time. Deliberately not Redis: this is a single-instance API server
 * (see rate-limit.ts's same reasoning), so an in-memory cache is correct and
 * adds zero infra. If the API ever scales to multiple instances, swap this
 * for a shared cache (Redis) so entries don't go stale independently per
 * instance.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await load();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/** Invalidate a cache entry immediately, e.g. after an admin write. */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Simple in-memory TTL cache for server-side football data.
 *
 * Shared across all route handler invocations within the same Node.js
 * process (standard Next.js server behaviour). Entries expire automatically
 * on next access; there is no background sweep.
 *
 * TTL is driven by API_CACHE_TTL_HOURS (default 24 h) in daily-sync mode.
 * AUTH_TTL is always 24 h regardless of the sync mode setting.
 */

const CACHE_TTL_HOURS = parseFloat(process.env.API_CACHE_TTL_HOURS || "24");
const CACHE_TTL_SECONDS = Math.max(1, Math.round(CACHE_TTL_HOURS * 3600));

export const DEFAULT_TTL = CACHE_TTL_SECONDS; // fixtures / standings / top scorers
export const LIVE_TTL    = CACHE_TTL_SECONDS; // live matches (not polled; same as data)
export const AUTH_TTL    = 86400;             // auth probe — always 24 h

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
}

const store = new Map<string, CacheEntry<unknown>>();

/** Returns the cached value, or null if the entry is absent or expired. */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/** Stores a value under key for ttlSeconds seconds. */
export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1_000,
  });
}

/** Removes a single entry by key. Used by the sync endpoint to force a fresh fetch. */
export function clearCacheKey(key: string): void {
  store.delete(key);
}

/** Removes all cached entries. Useful in tests or forced-refresh scenarios. */
export function clearCache(): void {
  store.clear();
}

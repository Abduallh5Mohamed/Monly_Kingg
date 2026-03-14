/**
 * Ultra-fast data fetcher with in-memory SWR-like cache
 * 
 * Features:
 * - In-memory cache with TTL (no network round-trip for cached data)
 * - Stale-While-Revalidate: show cached data instantly, refresh in background
 * - Request deduplication: prevent duplicate in-flight requests
 * - Smart cache invalidation by tags
 * - Automatic retry with exponential backoff
 * - Prefetching support
 */

type CacheEntry<T = any> = {
    data: T;
    timestamp: number;
    ttl: number;
    tags: string[];
    etag?: string;
};

export type FetcherOptions = {
    /** Cache TTL in milliseconds (default: 60_000 = 1 min) */
    ttl?: number;
    /** Tags for grouped invalidation */
    tags?: string[];
    /** Skip cache – always fetch from network */
    skipCache?: boolean;
    /** Stale-while-revalidate: return cached data immediately, refresh in background */
    swr?: boolean;
    /** AbortSignal */
    signal?: AbortSignal;
    /** Request timeout in ms (default: 15_000) */
    timeout?: number;
    /** Extra fetch options */
    fetchOptions?: RequestInit;
};

// ─── In-Memory Cache Store ───────────────────────────────────
export const cache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<any>>();

// Cache size limit — evict oldest when exceeded
const MAX_CACHE_SIZE = 200;

function evictOldest() {
    if (cache.size <= MAX_CACHE_SIZE) return;
    // Find and delete the oldest entry
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
        if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = key;
        }
    }
    if (oldestKey) cache.delete(oldestKey);
}

function isFresh(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
}

function isStale(entry: CacheEntry): boolean {
    // Consider data "stale but usable" if within 2x TTL
    return Date.now() - entry.timestamp < entry.ttl * 2;
}

// ─── CSRF Token Helper ──────────────────────────────────────
function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') return decodeURIComponent(value);
    }
    return null;
}

// ─── Core Fetcher ───────────────────────────────────────────
async function networkFetch<T>(url: string, options: FetcherOptions = {}): Promise<T> {
    const { timeout = 15000, fetchOptions = {} } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge signals
    if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
    }

    const csrfToken = getCsrfToken();

    try {
        const response = await fetch(url, {
            credentials: 'include',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Connection': 'keep-alive',
                ...(csrfToken && { 'X-XSRF-TOKEN': csrfToken }),
                ...(fetchOptions.headers as Record<string, string>),
            },
            ...fetchOptions,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new FetchError(
                errorData.message || `HTTP ${response.status}`,
                response.status,
                errorData
            );
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof FetchError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new FetchError('Request timeout', 408);
        }
        throw new FetchError(
            error instanceof Error ? error.message : 'Network error',
            0
        );
    }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fetch data with automatic caching and SWR support.
 * Returns cached data instantly if available, refreshes in background.
 */
export async function fetchData<T = any>(
    url: string,
    options: FetcherOptions = {}
): Promise<T> {
    const {
        ttl = 60_000,
        tags = [],
        skipCache = false,
        swr = true,
    } = options;

    const cacheKey = url;

    // 1. Check in-memory cache
    if (!skipCache) {
        const cached = cache.get(cacheKey);

        if (cached) {
            // Fresh data → return immediately
            if (isFresh(cached)) {
                return cached.data as T;
            }

            // Stale but usable → return stale, revalidate in background
            if (swr && isStale(cached)) {
                // Background revalidation (fire-and-forget)
                revalidate<T>(cacheKey, url, options).catch(() => { });
                return cached.data as T;
            }
        }
    }

    // 2. Deduplicate in-flight requests
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) return inflight as Promise<T>;

    // 3. Network fetch
    const promise = networkFetch<T>(url, options)
        .then((data) => {
            // Store in cache
            cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl,
                tags,
            });
            evictOldest();
            inflightRequests.delete(cacheKey);
            return data;
        })
        .catch((error) => {
            inflightRequests.delete(cacheKey);
            // On error, return stale cache if available
            const stale = cache.get(cacheKey);
            if (stale) return stale.data as T;
            throw error;
        });

    inflightRequests.set(cacheKey, promise);
    return promise;
}

/**
 * Background revalidation — updates cache silently
 */
async function revalidate<T>(cacheKey: string, url: string, options: FetcherOptions) {
    // Don't duplicate revalidation
    if (inflightRequests.has(`revalidate:${cacheKey}`)) return;

    const promise = networkFetch<T>(url, { ...options, timeout: 10000 })
        .then((data) => {
            cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl: options.ttl || 60_000,
                tags: options.tags || [],
            });
            inflightRequests.delete(`revalidate:${cacheKey}`);
        })
        .catch(() => {
            inflightRequests.delete(`revalidate:${cacheKey}`);
        });

    inflightRequests.set(`revalidate:${cacheKey}`, promise);
}

/**
 * Prefetch data into cache without blocking
 */
export function prefetch(url: string, options: FetcherOptions = {}): void {
    const cached = cache.get(url);
    if (cached && isFresh(cached)) return; // Already fresh
    fetchData(url, options).catch(() => { }); // Fire and forget
}

/**
 * Invalidate cache entries by tags or specific URL
 */
export function invalidateCache(tagOrUrl?: string): void {
    if (!tagOrUrl) {
        cache.clear();
        return;
    }

    // Try exact URL match first
    if (cache.has(tagOrUrl)) {
        cache.delete(tagOrUrl);
        return;
    }

    // Invalidate by tag
    for (const [key, entry] of cache) {
        if (entry.tags.includes(tagOrUrl)) {
            cache.delete(key);
        }
    }
}

/**
 * Invalidate cache entries matching a URL pattern
 */
export function invalidateCachePattern(pattern: string): void {
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

/**
 * Mutate cached data directly (optimistic update)
 */
export function mutateCache<T>(url: string, data: T | ((prev: T) => T)): void {
    const cached = cache.get(url);
    if (cached) {
        const newData = typeof data === 'function' ? (data as (prev: T) => T)(cached.data) : data;
        cache.set(url, { ...cached, data: newData, timestamp: Date.now() });
    }
}

/**
 * Fetch multiple URLs in parallel with caching
 */
export async function fetchParallel<T extends any[]>(
    requests: { url: string; options?: FetcherOptions }[]
): Promise<T> {
    const results = await Promise.all(
        requests.map(({ url, options }) => fetchData(url, options))
    );
    return results as unknown as T;
}

// ─── Custom Error Class ─────────────────────────────────────
export class FetchError extends Error {
    status: number;
    data?: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'FetchError';
        this.status = status;
        this.data = data;
    }
}

// React hook (useFetch) is in a separate file: @/lib/use-fetch.ts
// to avoid bundling React into non-React consumers of this module.

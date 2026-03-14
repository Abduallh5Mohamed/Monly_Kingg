'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchData, mutateCache, cache, FetchError } from './fetcher';
import type { FetcherOptions } from './fetcher';

interface UseFetchResult<T> {
    data: T | null;
    error: FetchError | null;
    loading: boolean;
    refetch: () => Promise<void>;
    mutate: (data: T | ((prev: T | null) => T)) => void;
}

/**
 * React hook for data fetching with automatic caching.
 * Shows cached data instantly, refreshes in background.
 *
 * @example
 * const { data, loading } = useFetch<GamesResponse>('/api/v1/games', { ttl: 300_000 });
 */
export function useFetch<T = any>(
    url: string | null,
    options: FetcherOptions = {}
): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(() => {
        if (url) {
            const cached = cache.get(url);
            if (cached) return cached.data as T;
        }
        return null;
    });
    const [error, setError] = useState<FetchError | null>(null);
    const [loading, setLoading] = useState<boolean>(!data);
    const mountedRef = useRef(true);

    const fetchFn = useCallback(async () => {
        if (!url) return;
        try {
            if (!cache.has(url)) setLoading(true);
            const result = await fetchData<T>(url, options);
            if (mountedRef.current) {
                setData(result);
                setError(null);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof FetchError ? err : new FetchError(String(err), 0));
                setLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    useEffect(() => {
        mountedRef.current = true;
        fetchFn();
        return () => { mountedRef.current = false; };
    }, [fetchFn]);

    const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
        const updated = typeof newData === 'function'
            ? (newData as (prev: T | null) => T)(data)
            : newData;
        setData(updated);
        if (url) {
            mutateCache(url, updated);
        }
    }, [data, url]);

    return { data, error, loading, refetch: fetchFn, mutate };
}

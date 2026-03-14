'use client';

import { useEffect } from 'react';
import { prefetch } from '@/lib/fetcher';

/**
 * Prefetch critical data on app mount so it's ready when user navigates.
 * All prefetches are fire-and-forget (non-blocking).
 */
export function DataPrefetcher() {
    useEffect(() => {
        // Games data is needed on dashboard + marketplace + listing creation
        // Prefetch with 5-min cache — will be instant when pages load
        prefetch('/api/v1/games', { ttl: 300_000, tags: ['games'] });

        // Prefetch active ads/campaigns (needed on dashboard)
        const timer = setTimeout(() => {
            prefetch('/api/v1/ads/active', { ttl: 120_000, tags: ['ads'] });
            prefetch('/api/v1/campaigns/active', { ttl: 120_000, tags: ['campaigns'] });
        }, 1000); // Delay 1s to not compete with initial page load

        return () => clearTimeout(timer);
    }, []);

    return null;
}

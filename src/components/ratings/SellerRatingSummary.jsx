'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SellerRatingSummary({ sellerId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/v1/ratings/seller/${sellerId}?limit=1`);
                if (!res.ok) {
                    throw new Error('Failed to fetch ratings');
                }
                const data = await res.json();
                if (isMounted) {
                    setStats(data.data || null);
                }
            } catch {
                if (isMounted) {
                    setStats(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (sellerId) {
            fetchStats();
        } else {
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [sellerId]);

    if (loading) {
        return (
            <div className="text-white/50 text-sm">Loading ratings...</div>
        );
    }

    if (!stats) {
        return (
            <div className="text-white/50 text-sm">No ratings yet</div>
        );
    }

    const average = Number(stats.averageRating || 0).toFixed(1);
    const total = stats.totalRatings || 0;

    return (
        <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-yellow-400">{average}</div>
            <div className="text-white/60 text-sm">({total})</div>
            <Link href={`/seller-ratings/${sellerId}`} className="text-cyan-400 hover:text-cyan-300 text-xs">
                View ratings
            </Link>
        </div>
    );
}

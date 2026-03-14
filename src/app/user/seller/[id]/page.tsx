'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import Link from 'next/link';
import {
    ArrowLeft, MessageSquare, Flag, Heart, Star, Crown, Shield,
    ShoppingCart, Clock, CheckCircle2, Gamepad2, ChevronRight,
    Circle, Package, Rating
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SellerRatingSummary from '@/components/ratings/SellerRatingSummary';
import SellerRatings from '@/components/ratings/SellerRatings';

interface SellerData {
    id: string;
    username: string;
    avatar: string;
    bio: string;
    isSeller: boolean;
    verified: boolean;
    createdAt: string;
    sellerSince: string;
    isOnline: boolean;
    lastSeenAt: string;
    stats: {
        level: number;
        rank: string;
        successfulTrades: number;
        totalSold: number;
    };
}

interface Listing {
    _id: string;
    title: string;
    price: number;
    coverImage: string | null;
    images: string[];
    game: { _id: string; name: string; icon?: string } | null;
    status: string;
    createdAt: string;
}

const RANK_COLORS: Record<string, string> = {
    Starter: 'from-gray-400 to-gray-500',
    Bronze: 'from-amber-600 to-amber-700',
    Silver: 'from-gray-300 to-gray-400',
    Gold: 'from-yellow-400 to-amber-500',
    Platinum: 'from-cyan-300 to-cyan-500',
    Diamond: 'from-purple-400 to-pink-500',
};

export default function SellerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const sellerId = params.id as string;
    const { user, loading: authLoading } = useAuth();

    const [seller, setSeller] = useState<SellerData | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFav, setIsFav] = useState(false);
    const [favIds, setFavIds] = useState<string[]>([]);

    const fetchSeller = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/users/seller/${sellerId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setSeller(data.data.seller);
                setListings(data.data.listings);
            } else {
                setError(data.message || 'Failed to load profile');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, [sellerId]);

    // Fetch favorite listing IDs
    const fetchFavIds = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/favorites/ids', { credentials: 'include' });
            const data = await res.json();
            if (data.success) setFavIds(data.data || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!authLoading && user && sellerId) {
            fetchSeller();
            fetchFavIds();
        }
    }, [user, authLoading, sellerId, fetchSeller, fetchFavIds]);

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    };

    const memberSince = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    const rankGradient = seller ? (RANK_COLORS[seller.stats.rank] || RANK_COLORS.Starter) : '';

    if (loading || authLoading) {
        return (
            <UserDashboardLayout>
                <div className="flex justify-center items-center py-32">
                    <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            </UserDashboardLayout>
        );
    }

    if (error || !seller) {
        return (
            <UserDashboardLayout>
                <div className="max-w-3xl mx-auto px-4 py-12 text-center">
                    <p className="text-white/50 mb-4">{error || 'Seller not found'}</p>
                    <Button onClick={() => router.back()} variant="outline" className="border-white/10 text-white/60">
                        Go Back
                    </Button>
                </div>
            </UserDashboardLayout>
        );
    }

    const isOwnProfile = user?.id === seller.id;

    return (
        <UserDashboardLayout>
            <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
                {/* Back Button */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Profile Header Card */}
                <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] overflow-hidden">
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-blue-600/20 relative">
                        <div className="absolute inset-0 bg-[url('/assets/pattern.svg')] opacity-5" />
                    </div>

                    {/* Profile Info */}
                    <div className="px-6 pb-6 -mt-12 relative">
                        <div className="flex items-end gap-4 mb-4">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-24 h-24 rounded-2xl border-4 border-[#0a0d16] overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600">
                                    {seller.avatar && !seller.avatar.includes('dicebear') ? (
                                        <img src={seller.avatar} alt={seller.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-white font-bold text-3xl">{seller.username[0].toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Online indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-[#0a0d16] ${seller.isOnline ? 'bg-green-500' : 'bg-white/20'}`} />
                            </div>

                            {/* Name & badges */}
                            <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl font-bold text-white truncate">{seller.username}</h1>
                                    {seller.isSeller && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                                    {seller.verified && <Shield className="w-4 h-4 text-cyan-400 shrink-0" />}
                                </div>
                                <p className="text-white/40 text-sm">
                                    {seller.isOnline ? (
                                        <span className="text-green-400">Online now</span>
                                    ) : (
                                        `Last seen ${timeAgo(seller.lastSeenAt)}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Bio */}
                        {seller.bio && (
                            <p className="text-white/60 text-sm mb-4 leading-relaxed">{seller.bio}</p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-5">
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.05]">
                                <p className="text-lg font-bold text-white">{seller.stats.level}</p>
                                <p className="text-white/40 text-xs">Level</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.05]">
                                <p className={`text-lg font-bold bg-gradient-to-r ${rankGradient} bg-clip-text text-transparent`}>{seller.stats.rank}</p>
                                <p className="text-white/40 text-xs">Rank</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.05]">
                                <p className="text-lg font-bold text-green-400">{seller.stats.successfulTrades}</p>
                                <p className="text-white/40 text-xs">Trades</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.05]">
                                <p className="text-lg font-bold text-cyan-400">{seller.stats.totalSold}</p>
                                <p className="text-white/40 text-xs">Sold</p>
                            </div>
                        </div>

                        {/* Member since */}
                        <div className="flex items-center gap-4 text-white/30 text-xs mb-5">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Member since {memberSince(seller.createdAt)}
                            </span>
                            {seller.sellerSince && (
                                <span className="flex items-center gap-1">
                                    <Crown className="w-3.5 h-3.5" />
                                    Seller since {memberSince(seller.sellerSince)}
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {!isOwnProfile && (
                            <div className="flex gap-2 flex-wrap">
                                <Link
                                    href={`/user/chat?seller=${seller.id}`}
                                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-medium transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Chat
                                </Link>
                                <Link
                                    href={`/user/tickets?report=${seller.id}&name=${seller.username}`}
                                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 text-sm font-medium transition-all"
                                >
                                    <Flag className="w-4 h-4" />
                                    Report
                                </Link>
                                <Link
                                    href={`/seller-ratings/${seller.id}`}
                                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-yellow-500/30 hover:bg-yellow-500/5 text-white/70 hover:text-yellow-400 text-sm font-medium transition-all"
                                >
                                    <Star className="w-4 h-4" />
                                    Rate
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller Ratings Section */}
                <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Seller Ratings
                            </h2>
                            {!isOwnProfile && (
                                <Link
                                    href={`/seller-ratings/${seller.id}`}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                                >
                                    View All →
                                </Link>
                            )}
                        </div>
                        
                        {/* Rating Summary */}
                        <SellerRatingSummary sellerId={seller.id} />

                        {/* Recent Ratings Preview */}
                        <div className="mt-6">
                            <SellerRatings sellerId={seller.id} limit={3} />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-cyan-400" />
                            Available Listings
                            <span className="text-white/30 text-sm font-normal ml-1">({listings.length})</span>
                        </h2>
                    </div>

                    {listings.length === 0 ? (
                        <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-12 text-center">
                            <ShoppingCart className="w-10 h-10 text-white/15 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">No listings available</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {listings.map(listing => {
                                const img = listing.coverImage || listing.images?.[0];
                                const isLiked = favIds.includes(listing._id);

                                return (
                                    <Link key={listing._id} href={`/listings/${listing._id}`}>
                                        <div className="group bg-[#0a0d16]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden hover:border-cyan-500/20 transition-all">
                                            {/* Image */}
                                            <div className="relative aspect-[5/4] bg-white/[0.02]">
                                                {img ? (
                                                    <img src={img} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Gamepad2 className="w-8 h-8 text-white/10" />
                                                    </div>
                                                )}
                                                {/* Game badge */}
                                                {listing.game && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-medium">
                                                        {listing.game.name}
                                                    </div>
                                                )}
                                                {/* Fav button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleFav(listing._id);
                                                    }}
                                                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-white/40 hover:text-white'}`}
                                                >
                                                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>
                                            {/* Info */}
                                            <div className="p-3">
                                                <p className="text-white text-sm font-medium truncate mb-1">{listing.title}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-cyan-400 font-bold text-sm">{listing.price.toLocaleString()} EGP</span>
                                                    <span className="text-white/20 text-xs">{timeAgo(listing.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </UserDashboardLayout>
    );

    async function toggleFav(listingId: string) {
        try {
            const csrfMod = await import('@/utils/csrf');
            await csrfMod.ensureCsrfToken();

            const res = await fetch(`/api/v1/favorites/${listingId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'x-csrf-token': getCsrf() },
            });
            const data = await res.json();
            if (data.success) {
                if (data.favorited) {
                    setFavIds(prev => [...prev, listingId]);
                } else {
                    setFavIds(prev => prev.filter(id => id !== listingId));
                }
            }
        } catch { /* ignore */ }
    }
}

function getCsrf(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

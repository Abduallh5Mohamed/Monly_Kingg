'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Star,
    ShoppingCart,
    Flame,
    Sparkles,
    Crown,
    TrendingUp,
    Gamepad2,
    Loader2,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';

interface Listing {
    _id: string;
    title: string;
    game: { _id: string; name: string; slug: string } | string;
    description: string;
    price: number;
    details: any;
    images: string[];
    coverImage: string;
    status: 'available' | 'sold';
    seller: { username: string } | string;
    createdAt: string;
}

// Badge types
const PROMO_BADGES = [
    { label: 'TRENDING', color: 'bg-orange-500', textColor: 'text-white', icon: TrendingUp },
    { label: 'HOT', color: 'bg-red-500', textColor: 'text-white', icon: Flame },
    { label: 'NEW', color: 'bg-cyan-500', textColor: 'text-white', icon: Sparkles },
    { label: 'POPULAR', color: 'bg-purple-500', textColor: 'text-white', icon: Crown },
];

const GAME_BADGES: Record<string, { color: string; label: string; textColor: string }> = {
    'League of Legends': { color: 'bg-blue-600', label: 'RIOT EUW', textColor: 'text-white' },
    'Valorant': { color: 'bg-red-600', label: 'RIOT EUW', textColor: 'text-white' },
    'PUBG Mobile': { color: 'bg-yellow-600', label: 'GLOBAL', textColor: 'text-white' },
    'FIFA / FC': { color: 'bg-green-600', label: 'EA FC 25', textColor: 'text-white' },
};

function getPromoBadge(index: number) {
    return PROMO_BADGES[index % PROMO_BADGES.length];
}

function getRandomDiscount() {
    const discounts = [20, 25, 27, 33];
    return discounts[Math.floor(Math.random() * discounts.length)];
}

function getRandomRating() {
    return (4.5 + Math.random() * 0.5).toFixed(1);
}

function getRandomReviews() {
    return Math.floor(80 + Math.random() * 200);
}

export default function MarketplacePage() {
    const router = useRouter();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGame, setSelectedGame] = useState<string>('all');
    const [games, setGames] = useState<any[]>([]);

    useEffect(() => {
        fetchGames();
        fetchListings();
    }, []);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/v1/games');
            const data = await res.json();
            if (data.data) setGames(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchListings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/listings/public?limit=100');
            const data = await res.json();
            if (data.success && data.data) {
                setListings(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getGameName = (listing: Listing) => {
        return typeof listing.game === 'object' ? listing.game.name : listing.game;
    };

    const getCoverImage = (listing: Listing) => {
        if (listing.coverImage) return listing.coverImage;
        if (listing.images && listing.images.length > 0) return listing.images[0];
        return null;
    };

    const filteredListings = listings.filter((listing) => {
        const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGame = selectedGame === 'all' || getGameName(listing) === selectedGame;
        return matchesSearch && matchesGame;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e]">
            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/[0.03] blur-[120px]" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-[#0a0b14]/80 backdrop-blur-xl border-b border-white/[0.06]">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Gamepad2 className="w-7 h-7 text-cyan-400" />
                                Game Accounts Marketplace
                            </h1>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search accounts..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64 h-10 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                            <button
                                onClick={() => setSelectedGame('all')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedGame === 'all'
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                All Games
                            </button>
                            {games.map((game) => (
                                <button
                                    key={game._id}
                                    onClick={() => setSelectedGame(game.name)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedGame === game.name
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    {game.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                        </div>
                    ) : filteredListings.length === 0 ? (
                        <div className="text-center py-20">
                            <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-white/10" />
                            <p className="text-white/40 text-lg">No accounts found</p>
                            <p className="text-white/20 text-sm mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredListings.map((listing, index) => {
                                const gameName = getGameName(listing);
                                const coverUrl = getCoverImage(listing);
                                const promoBadge = getPromoBadge(index);
                                const PromoBadgeIcon = promoBadge.icon;
                                const discount = getRandomDiscount();
                                const originalPrice = Math.round(listing.price / (1 - discount / 100));
                                const gameBadge = GAME_BADGES[gameName] || { color: 'bg-gray-600', label: gameName?.toUpperCase() || 'GAME', textColor: 'text-white' };
                                const rating = getRandomRating();
                                const reviewCount = getRandomReviews();

                                return (
                                    <div
                                        key={listing._id}
                                        className="group rounded-2xl overflow-hidden bg-[#0d1117] border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col cursor-pointer"
                                        onClick={() => router.push(`/listing/${listing._id}`)}
                                    >
                                        {/* Cover Image */}
                                        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1a1d2e] to-[#0d1117]">
                                            {coverUrl ? (
                                                <Image
                                                    src={coverUrl}
                                                    alt={listing.title}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Gamepad2 className="w-16 h-16 text-white/10" />
                                                </div>
                                            )}

                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />

                                            {/* Top badges */}
                                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                <span className={`${promoBadge.color} ${promoBadge.textColor} text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-lg`}>
                                                    <PromoBadgeIcon className="w-3.5 h-3.5" />
                                                    {promoBadge.label}
                                                </span>
                                                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-lg">
                                                    -{discount}%
                                                </span>
                                            </div>

                                            {/* Game badge */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`${gameBadge.color} ${gameBadge.textColor} text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide shadow-lg`}>
                                                    {gameBadge.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            {/* Game category */}
                                            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{gameName}</p>

                                            {/* Title */}
                                            <h3 className="text-base font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-300 transition-colors leading-tight">
                                                {listing.title}
                                            </h3>

                                            {/* Rating */}
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-sm text-white/80 font-bold">{rating}</span>
                                                </div>
                                                <span className="text-xs text-white/30">({reviewCount} reviews)</span>
                                            </div>

                                            {/* Spacer */}
                                            <div className="flex-1" />

                                            {/* Price */}
                                            <div className="mb-4">
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-3xl font-bold text-white">€{listing.price}</span>
                                                    <span className="text-sm text-white/30 line-through">€{originalPrice}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle buy now
                                                    }}
                                                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02]"
                                                >
                                                    Buy Now
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle add to cart
                                                    }}
                                                    className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 text-sm font-medium hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all duration-200"
                                                >
                                                    <ShoppingCart className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Add to Cart</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Gamepad2, Loader2, ShoppingBag, ArrowUpDown, Filter } from 'lucide-react';

interface Game {
    _id: string;
    name: string;
}

interface Listing {
    _id: string;
    title: string;
    game: { _id: string; name: string } | null;
    seller: { _id: string; username: string } | null;
    description: string;
    price: number;
    coverImage: string | null;
    images: string[];
    details: any;
    status: string;
    createdAt: string;
}

export function AccountsSection() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedGame, setSelectedGame] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');

    useEffect(() => {
        fetch('/api/v1/listings/games')
            .then(res => res.json())
            .then(data => { if (data.data) setGames(data.data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchListings();
    }, [selectedGame, sort, page]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '12');
            params.set('sort', sort);
            if (selectedGame) params.set('game', selectedGame);
            if (search) params.set('search', search);

            const res = await fetch(`/api/v1/listings/browse?${params.toString()}`);
            const data = await res.json();
            if (data.data) {
                setListings(data.data);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => { setPage(1); fetchListings(); };

    return (
        <section id="accounts" className="py-24 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 center w-full h-[500px] bg-gradient-to-b from-[#0a0b14] via-[#0f1419]/50 to-transparent" />
                <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-px w-8 bg-cyan-500/50"></span>
                            <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Marketplace</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Accounts</span>
                        </h2>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-auto min-w-[300px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-white/30" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="block w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all hover:bg-white/[0.05]"
                            placeholder="Search by title, rank, or skin..."
                        />
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white/[0.02] border border-white/[0.05] p-2 rounded-2xl backdrop-blur-sm">
                    {/* Game Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full sm:w-auto pb-2 sm:pb-0">
                        <button
                            onClick={() => { setSelectedGame(''); setPage(1); }}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${!selectedGame
                                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                                }`}
                        >
                            All Games
                        </button>
                        {games.map(g => (
                            <button
                                key={g._id}
                                onClick={() => { setSelectedGame(g._id); setPage(1); }}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${selectedGame === g._id
                                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                                    }`}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 border-l border-white/5 pl-4 ml-auto sm:ml-0">
                        <span className="text-xs text-white/40 font-medium hidden sm:block">Sort by:</span>
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                                className="appearance-none bg-transparent border-none text-xs font-bold text-white/90 focus:ring-0 cursor-pointer pr-6 py-1"
                            >
                                <option value="newest" className="bg-[#1a1d28]">Newest</option>
                                <option value="price_asc" className="bg-[#1a1d28]">Price: Low to High</option>
                                <option value="price_desc" className="bg-[#1a1d28]">Price: High to Low</option>
                            </select>
                            <ArrowUpDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Listings Grid */}
                {loading ? (
                    <div className="min-h-[400px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                            <p className="text-white/30 text-sm font-medium animate-pulse">Loading amazing accounts...</p>
                        </div>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="min-h-[400px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                        <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                            <ShoppingBag className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-lg font-bold text-white/80 mb-2">No accounts found</h3>
                        <p className="text-white/40 text-sm max-w-xs text-center">
                            We couldn't find any accounts matching your current filters. Try selecting a different game or clearing your search.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map((listing, i) => (
                            <div
                                key={listing._id}
                                className="group relative bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] hover:-translate-y-1"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                {/* Image Area */}
                                <div className="aspect-[16/10] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent z-10 opacity-60" />
                                    {listing.coverImage || (listing.images && listing.images.length > 0) ? (
                                        <img
                                            src={listing.coverImage || listing.images[0]}
                                            alt={listing.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                                            <Gamepad2 className="w-12 h-12 text-white/10" />
                                        </div>
                                    )}

                                    {/* Floating Price Tag */}
                                    <div className="absolute top-3 right-3 z-20">
                                        <div className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-xl">
                                            <span className="text-xs text-emerald-400 font-bold">$</span>
                                            <span className="text-sm font-bold text-white tracking-wide">{listing.price}</span>
                                        </div>
                                    </div>

                                    {/* Game Badge */}
                                    {listing.game && (
                                        <div className="absolute top-3 left-3 z-20">
                                            <div className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                                                {listing.game.name}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="p-4 relative z-20">
                                    <h3 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                                        {listing.title}
                                    </h3>

                                    {listing.seller && (
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[8px] font-bold text-black border border-white/20">
                                                {listing.seller.username.substring(0, 1).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-white/50">{listing.seller.username}</span>
                                        </div>
                                    )}

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {listing.details && Object.entries(listing.details).slice(0, 2).map(([key, value]) => (
                                            <div key={key} className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] flex flex-col items-center text-center">
                                                <span className="text-[9px] text-white/30 uppercase tracking-wider">{key}</span>
                                                <span className="text-[10px] text-white/80 font-medium truncate w-full">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action */}
                                    <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                        <span className="text-[10px] text-white/30">{new Date(listing.createdAt).toLocaleDateString()}</span>
                                        <button className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            View Details <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-12 bg-white/[0.02] p-2 rounded-2xl w-fit mx-auto border border-white/5 backdrop-blur-sm">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-white/40 px-2">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

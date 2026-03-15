'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import Link from 'next/link';
import {
    Gamepad2,
    Search,
    ShieldCheck,
    ShoppingCart,
    Crown,
    Star,
    Loader2,
    SlidersHorizontal,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    Flame,
    ArrowUpDown,
    Filter,
    LayoutGrid,
    LayoutList,
    Zap,
    Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useRouter } from 'next/navigation';

/* ── Types ── */
interface Listing {
    _id: string;
    title: string;
    game: { _id: string; name: string } | null;
    seller: { _id: string; username: string } | null;
    price: number;
    coverImage: string | null;
    images: string[];
    details: Record<string, unknown>;
    status: string;
    createdAt: string;
    discount?: {
        originalPrice: number;
        discountedPrice: number;
        discountPercent: number;
        isMandatory?: boolean;
    };
}

interface Game {
    _id: string;
    name: string;
}

/* ═══════════ LISTING CARD (GRID) ═══════════ */
function ListingCard({ listing, currentUserId, language }: { listing: Listing; currentUserId?: string; language: 'ar' | 'en' }) {
    const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
    const isOwner = !!(currentUserId && listing.seller && listing.seller._id === currentUserId);
    const hasDiscount = !!listing.discount;
    const discountPercent = hasDiscount ? listing.discount!.discountPercent : 0;
    const originalPrice = hasDiscount ? listing.discount!.originalPrice : listing.price;
    const displayPrice = hasDiscount ? listing.discount!.discountedPrice : listing.price;
    const passPrice = (displayPrice * 0.82).toFixed(2);

    return (
        <Link
            href={`/listings/${listing._id}`}
            className="group/card relative isolate"
        >
            {/* Hover border glow - Enhanced */}
            <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover/card:from-cyan-500/40 group-hover/card:via-blue-500/30 group-hover/card:to-purple-500/40 transition-all duration-700 opacity-0 group-hover/card:opacity-100 blur-xl" />

            <div className="relative bg-gradient-to-b from-[#0f1425] to-[#0a0d18] rounded-3xl border border-white/[0.08] group-hover/card:border-white/[0.15] overflow-hidden transition-all duration-500 group-hover/card:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] group-hover/card:-translate-y-2">
                {/* Image */}
                <div className="relative aspect-[5/4] overflow-hidden">
                    {listing.coverImage || listing.images?.length > 0 ? (
                        <img
                            src={listing.coverImage || listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-1000 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500/[0.08] to-purple-500/[0.04] flex items-center justify-center">
                            <Gamepad2 className="w-12 h-12 text-white/[0.08]" />
                        </div>
                    )}

                    {/* Verified */}
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    </span>

                    {/* Discount badge / Owner badge */}
                    {isOwner ? (
                        <span className="absolute bottom-2 left-2 bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Your Listing
                        </span>
                    ) : hasDiscount ? (
                        <span className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
                            -{discountPercent}%
                        </span>
                    ) : null}

                    {/* Seller */}
                    {listing.seller && (
                        <span className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white/70 text-[9px] font-medium px-1.5 py-0.5 rounded-md">
                            @{listing.seller.username}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="p-3">
                    <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-white transition-colors leading-tight">
                        {listing.title}
                    </h3>

                    {/* Game & Region tags */}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {listing.game && (
                            <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">
                                {listing.game.name}
                            </span>
                        )}
                    </div>

                    {/* Prices */}
                    <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
                        <div>
                            {!isOwner && hasDiscount && <p className="text-[10px] text-white/20 line-through">EGP {originalPrice.toFixed(2)}</p>}
                            <p className="text-base font-black text-white">EGP {displayPrice.toFixed(2)}</p>
                        </div>
                        {!isOwner && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/20 transition-all duration-300 hover:scale-110"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* SEAL PASS Price — hide for owner */}
                    {!isOwner && (
                        <div className="mt-2 bg-gradient-to-r from-violet-500/80 to-purple-600/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                            <span className="text-white font-bold text-[13px]">${passPrice}</span>
                            <span className="text-white/60 text-[9px] flex items-center gap-1">
                                with <Crown className="w-2.5 h-2.5 text-yellow-300" /> <span className="font-bold text-white/80">PASS</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

/* ═══════════ MAIN BROWSE PAGE ═══════════ */
export default function StoreBrowsePage() {
    const { user, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
    const router = useRouter();

    // Redirect non-sellers away
    useEffect(() => {
        if (authLoading) return;
        if (user && !user.isSeller) {
            router.replace('/user');
        }
    }, [user, authLoading, router]);

    const [listings, setListings] = useState<Listing[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGame, setSelectedGame] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [gameDropdownOpen, setGameDropdownOpen] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const LIMIT = 20;

    // Fetch games for filter with caching
    useEffect(() => {
        const cachedGames = sessionStorage.getItem('games_list');
        const cacheTime = sessionStorage.getItem('games_list_time');
        const now = Date.now();
        const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

        if (cachedGames && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
            setGames(JSON.parse(cachedGames));
            return;
        }

        fetch('/api/v1/listings/games')
            .then((r) => r.json())
            .then((d) => {
                if (d.data) {
                    setGames(d.data);
                    sessionStorage.setItem('games_list', JSON.stringify(d.data));
                    sessionStorage.setItem('games_list_time', now.toString());
                }
            })
            .catch(() => { });
    }, []);

    // Fetch listings
    const fetchListings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(LIMIT));
            params.set('sort', sortBy);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (selectedGame) params.set('game', selectedGame);
            if (minPrice) params.set('minPrice', minPrice);
            if (maxPrice) params.set('maxPrice', maxPrice);

            const res = await fetch(`/api/v1/listings/browse?${params.toString()}`);
            const data = await res.json();
            if (data.data) {
                setListings(data.data);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error('Failed to fetch listings:', err);
        } finally {
            setLoading(false);
        }
    }, [page, sortBy, searchQuery, selectedGame, minPrice, maxPrice]);

    useEffect(() => { fetchListings(); }, [fetchListings]);

    // Reset page on filter change
    const handleFilterChange = () => {
        setPage(1);
    };

    // Search debounce
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => {
            setSearchQuery(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = () => { setGameDropdownOpen(false); setSortDropdownOpen(false); };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    const sortOptions = [
        { value: 'newest', label: tr('الأحدث أولًا', 'Newest First'), icon: '🆕' },
        { value: 'price_asc', label: tr('السعر: الأقل إلى الأعلى', 'Price: Low to High'), icon: '💰' },
        { value: 'price_desc', label: tr('السعر: الأعلى إلى الأقل', 'Price: High to Low'), icon: '💎' },
    ];

    const activeFiltersCount = [selectedGame, minPrice, maxPrice].filter(Boolean).length;
    const selectedGameName = games.find(g => g._id === selectedGame)?.name;

    return (
        <UserDashboardLayout>
            <div className="min-h-screen pb-28 space-y-6">

                {/* ═══════════ HEADER ═══════════ */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1225] via-[#0f1630] to-[#0a0f20] border border-white/[0.04] p-6">
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-52 h-52 bg-cyan-500/[0.05] rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/[0.05] rounded-full blur-[60px]" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Flame className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-white">{tr('المتجر', 'Store')}</h1>
                                <p className="text-[11px] text-white/30">{tr('تصفح واشترِ حسابات الألعاب وبطاقات الهدايا والمزيد', 'Browse and buy gaming accounts, gift cards, and more')}</p>
                            </div>
                        </div>

                        {/* Search bar */}
                        <div className="relative mt-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={tr('ابحث عن حسابات، ألعاب، بطاقات هدايا...', 'Search accounts, games, gift cards...')}
                                className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all duration-300"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Filter bar */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {/* Game filter dropdown */}
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { setGameDropdownOpen(!gameDropdownOpen); setSortDropdownOpen(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all duration-200 ${selectedGame
                                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                                        }`}
                                >
                                    <Gamepad2 className="w-3.5 h-3.5" />
                                    {selectedGameName || tr('كل الألعاب', 'All Games')}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${gameDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {gameDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1.5 w-56 max-h-64 overflow-y-auto rounded-xl bg-[#12162a] border border-white/[0.08] shadow-2xl shadow-black/50 z-50 py-1 scrollbar-hide">
                                        <button
                                            onClick={() => { setSelectedGame(''); setGameDropdownOpen(false); handleFilterChange(); }}
                                            className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${!selectedGame ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                                                }`}
                                        >
                                            {tr('كل الألعاب', 'All Games')}
                                        </button>
                                        {games.map((g) => (
                                            <button
                                                key={g._id}
                                                onClick={() => { setSelectedGame(g._id); setGameDropdownOpen(false); handleFilterChange(); }}
                                                className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${selectedGame === g._id ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                                                    }`}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sort dropdown */}
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setGameDropdownOpen(false); }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-200"
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    {sortOptions.find(s => s.value === sortBy)?.label}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {sortDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-[#12162a] border border-white/[0.08] shadow-2xl shadow-black/50 z-50 py-1">
                                        {sortOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); handleFilterChange(); }}
                                                className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${sortBy === opt.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                                                    }`}
                                            >
                                                <span>{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Price filter toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all duration-200 ${showFilters || minPrice || maxPrice
                                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                                    }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {tr('السعر', 'Price')}
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-cyan-500 text-[9px] font-bold text-white flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>

                            {/* Clear all filters */}
                            {(selectedGame || minPrice || maxPrice || searchInput) && (
                                <button
                                    onClick={() => {
                                        setSelectedGame('');
                                        setMinPrice('');
                                        setMaxPrice('');
                                        setSearchInput('');
                                        setSortBy('newest');
                                        setPage(1);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-red-400/60 hover:text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all duration-200"
                                >
                                    <X className="w-3 h-3" />
                                    {tr('مسح', 'Clear')}
                                </button>
                            )}

                            {/* Results count */}
                            <div className="ml-auto text-[11px] text-white/20 font-medium">
                                {total > 0 ? tr(`${total} نتيجة`, `${total} results`) : ''}
                            </div>
                        </div>

                        {/* Expanded price filter */}
                        {showFilters && (
                            <div className="flex items-center gap-2 mt-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                                    <span className="text-[11px] text-white/25">$</span>
                                    <input
                                        type="number"
                                        value={minPrice}
                                        onChange={(e) => { setMinPrice(e.target.value); handleFilterChange(); }}
                                        placeholder={tr('الحد الأدنى', 'Min')}
                                        className="w-16 bg-transparent text-white text-[12px] placeholder:text-white/15 focus:outline-none"
                                    />
                                </div>
                                <span className="text-white/15 text-[11px]">{tr('إلى', 'to')}</span>
                                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                                    <span className="text-[11px] text-white/25">$</span>
                                    <input
                                        type="number"
                                        value={maxPrice}
                                        onChange={(e) => { setMaxPrice(e.target.value); handleFilterChange(); }}
                                        placeholder={tr('الحد الأعلى', 'Max')}
                                        className="w-16 bg-transparent text-white text-[12px] placeholder:text-white/15 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════ ACTIVE FILTER TAGS ═══════════ */}
                {(selectedGame || minPrice || maxPrice) && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedGameName && (
                            <span className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-cyan-500/15">
                                <Gamepad2 className="w-3 h-3" />
                                {selectedGameName}
                                <button onClick={() => { setSelectedGame(''); handleFilterChange(); }} className="ml-0.5 hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {minPrice && (
                            <span className="flex items-center gap-1.5 bg-white/[0.05] text-white/50 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/[0.06]">
                                {tr('من', 'Min')}: ${minPrice}
                                <button onClick={() => { setMinPrice(''); handleFilterChange(); }} className="ml-0.5 hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {maxPrice && (
                            <span className="flex items-center gap-1.5 bg-white/[0.05] text-white/50 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/[0.06]">
                                {tr('إلى', 'Max')}: ${maxPrice}
                                <button onClick={() => { setMaxPrice(''); handleFilterChange(); }} className="ml-0.5 hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                )}

                {/* ═══════════ LISTINGS GRID ═══════════ */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                            <span className="text-[12px] text-white/20">{tr('جاري تحميل الإعلانات...', 'Loading listings...')}</span>
                        </div>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                            <Search className="w-8 h-8 text-white/10" />
                        </div>
                        <div className="text-center">
                            <p className="text-white/40 text-sm font-medium">{tr('لا توجد إعلانات مطابقة', 'No matching listings')}</p>
                            <p className="text-white/20 text-[12px] mt-1">{tr('جرّب تعديل الفلاتر أو البحث', 'Try adjusting filters or search')}</p>
                        </div>
                        {(selectedGame || minPrice || maxPrice || searchInput) && (
                            <button
                                onClick={() => {
                                    setSelectedGame('');
                                    setMinPrice('');
                                    setMaxPrice('');
                                    setSearchInput('');
                                    setSortBy('newest');
                                    setPage(1);
                                }}
                                className="text-[12px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                            >
                                {tr('مسح كل الفلاتر', 'Clear all filters')}
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {listings.map((listing) => (
                                <ListingCard key={listing._id} listing={listing} currentUserId={user?.id} language={language} />
                            ))}
                        </div>

                        {/* ═══════════ PAGINATION ═══════════ */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page <= 1}
                                    className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-9 h-9 rounded-xl text-[12px] font-semibold flex items-center justify-center transition-all ${page === pageNum
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                                                : 'bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page >= totalPages}
                                    className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </UserDashboardLayout>
    );
}

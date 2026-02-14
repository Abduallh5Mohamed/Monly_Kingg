'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Loader2,
  ShoppingBag,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Star,
  Filter,
  LayoutGrid,
  List,
  Flame,
} from 'lucide-react';

/* ─────────── types ─────────── */
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
  details: Record<string, unknown>;
  status: string;
  createdAt: string;
}

/* ─────────── helpers ─────────── */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Popular' },
] as const;

const PRICE_RANGES = [
  { label: 'Any', min: '', max: '' },
  { label: 'Under $25', min: '', max: '25' },
  { label: '$25 – $50', min: '25', max: '50' },
  { label: '$50 – $100', min: '50', max: '100' },
  { label: '$100 – $250', min: '100', max: '250' },
  { label: '$250+', min: '250', max: '' },
] as const;

/* ============================================================ */
export default function BrowseAccountsPage() {
  /* ── data state ── */
  const [listings, setListings] = useState<Listing[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /* ── filter state ── */
  const [selectedGame, setSelectedGame] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activePriceLabel, setActivePriceLabel] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  /* ── fetch games once ── */
  useEffect(() => {
    fetch('/api/v1/listings/games')
      .then((r) => r.json())
      .then((d) => { if (d.data) setGames(d.data); })
      .catch(() => { });
  }, []);

  /* ── fetch listings ── */
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('limit', '12');
      p.set('sort', sort);
      if (selectedGame) p.set('game', selectedGame);
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (minPrice) p.set('minPrice', minPrice);
      if (maxPrice) p.set('maxPrice', maxPrice);

      const res = await fetch(`/api/v1/listings/browse?${p.toString()}`);
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
  }, [page, sort, selectedGame, debouncedSearch, minPrice, maxPrice]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  /* ── helpers ── */
  const resetFilters = () => {
    setSelectedGame('');
    setSearch('');
    setDebouncedSearch('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setActivePriceLabel('Any');
    setPage(1);
  };

  const selectPriceRange = (r: typeof PRICE_RANGES[number]) => {
    setMinPrice(r.min);
    setMaxPrice(r.max);
    setActivePriceLabel(r.label);
    setPage(1);
  };

  const hasActiveFilters = selectedGame || debouncedSearch || minPrice || maxPrice || sort !== 'newest';

  const activeGameName = games.find((g) => g._id === selectedGame)?.name;

  /* ── pagination helpers ── */
  const pageNumbers: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i);
    if (page < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return (
    <UserDashboardLayout>
      <div className="min-h-screen pb-20">
        
        {/* ════════════════════ GAME CATEGORIES TABS ════════════════════ */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => { setSelectedGame(''); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                !selectedGame
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Flame className="w-4 h-4" />
              All Games
            </button>
            {games.map((game) => (
              <button
                key={game._id}
                onClick={() => { setSelectedGame(game._id); setPage(1); }}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedGame === game._id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════ SEARCH + FILTERS BAR ════════════════════ */}
        <div className="sticky top-0 z-30 py-3 backdrop-blur-xl bg-[#0a0b14]/80">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Search for accounts, skins, ranks..."
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/30 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="appearance-none h-12 rounded-xl border border-white/10 bg-white/5 pl-4 pr-10 text-sm font-medium text-white/80 outline-none cursor-pointer hover:bg-white/[0.08] focus:border-cyan-500/50 transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#1a1d28] text-white">{o.label}</option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters((p) => !p)}
                className={`h-12 px-4 rounded-xl border font-medium text-sm flex items-center gap-2 transition-all ${
                  showFilters 
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' 
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {/* View toggle */}
              <div className="hidden sm:flex h-12 rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="h-12 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-medium text-sm hover:bg-rose-500/20 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#12151c] p-5 space-y-5">
              {/* Price range */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Price Range</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => selectPriceRange(r)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activePriceLabel === r.label
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                          : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Custom price inputs */}
                <div className="mt-4 flex items-center gap-3 max-w-sm">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => { setMinPrice(e.target.value); setActivePriceLabel(''); setPage(1); }}
                      placeholder="Min"
                      className="w-full h-10 rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <span className="text-white/30">—</span>
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => { setMaxPrice(e.target.value); setActivePriceLabel(''); setPage(1); }}
                      placeholder="Max"
                      className="w-full h-10 rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active filters chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeGameName && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300">
                  {activeGameName}
                  <button onClick={() => { setSelectedGame(''); setPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-300">
                  {minPrice && maxPrice ? `$${minPrice} – $${maxPrice}` : minPrice ? `$${minPrice}+` : `Under $${maxPrice}`}
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); setActivePriceLabel('Any'); setPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-medium text-purple-300">
                  "{debouncedSearch}"
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════ RESULTS INFO ════════════════════ */}
        <div className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-white/50">
              {loading ? 'Searching...' : (
                <>
                  <span className="font-semibold text-white">{total}</span> accounts found
                </>
              )}
            </p>
            {activeGameName && (
              <span className="text-sm text-cyan-400">in {activeGameName}</span>
            )}
          </div>
          {totalPages > 1 && (
            <p className="text-sm text-white/40">
              Page {page} of {totalPages}
            </p>
          )}
        </div>

        {/* ════════════════════ LISTINGS GRID ════════════════════ */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <p className="text-sm text-white/40">Finding the best accounts...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            <ShoppingBag className="h-16 w-16 text-white/10 mb-4" />
            <h3 className="text-lg font-bold text-white/70 mb-2">No accounts found</h3>
            <p className="text-sm text-white/40 text-center max-w-sm mb-4">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium text-sm hover:bg-cyan-500/20 transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {listings.map((listing) => (
              <Link
                key={listing._id}
                href={`/listings/${listing._id}`}
                className={`group relative overflow-hidden rounded-2xl bg-[#12151c] border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 ${
                  viewMode === 'list' ? 'flex gap-4' : ''
                }`}
              >
                {/* Image */}
                <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-32 shrink-0' : 'aspect-[4/3]'}`}>
                  {listing.coverImage || listing.images?.length > 0 ? (
                    <img
                      src={listing.coverImage || listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-white/10" />
                    </div>
                  )}

                  {/* Game Badge */}
                  {listing.game && (
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                      {listing.game.name}
                    </span>
                  )}

                  {/* Verified */}
                  <span className="absolute top-2 right-2 bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 p-1.5 rounded-lg">
                    <ShieldCheck className="w-3 h-3" />
                  </span>

                  {/* Price Tag (Grid only) */}
                  {viewMode === 'grid' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-white">${listing.price}</p>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-medium">5.0</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`p-3 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-center' : ''}`}>
                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">
                    {listing.title}
                  </h3>

                  {listing.seller && (
                    <p className="text-xs text-white/40 mt-1">by {listing.seller.username}</p>
                  )}

                  {/* Details */}
                  {listing.details && Object.keys(listing.details).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(listing.details).slice(0, viewMode === 'list' ? 4 : 2).map(([key, value]) => (
                        <span key={key} className="bg-white/5 text-[10px] text-white/50 px-2 py-0.5 rounded">
                          {String(value)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price (List view) */}
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-4 mt-3">
                      <p className="text-xl font-black text-white">${listing.price}</p>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-medium">5.0</span>
                      </div>
                      <button className="ml-auto px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-400 transition-colors">
                        View
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ════════════════════ PAGINATION ════════════════════ */}
        {totalPages > 1 && !loading && (
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-[#12151c] p-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {pageNumbers.map((n, i) =>
                n === '...' ? (
                  <span key={`e-${i}`} className="px-2 text-white/30">...</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                      page === n
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}

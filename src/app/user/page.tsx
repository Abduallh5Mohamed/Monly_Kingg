'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import Link from 'next/link';
import {
  Gamepad2,
  Monitor,
  Gift,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Loader2,
  ShoppingCart,
  Heart,
  CreditCard,
  Timer,
  Headphones,
  Crown,
  Laptop,
  Flame,
  Star,
  TrendingUp,
  Sparkles,
  Megaphone,
  Percent,
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  Package,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ensureCsrfToken } from '@/utils/csrf';
import { fetchData, fetchParallel, prefetch } from '@/lib/fetcher';

/* ── Types ── */
interface Listing {
  _id: string;
  title: string;
  game: { _id: string; name: string } | null;
  seller: { _id: string; username: string; avatar?: string } | null;
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
  slug: string;
  icon?: string;
}

interface DashboardAd {
  _id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  position: string;
  priority: number;
}

interface ActiveDiscount {
  _id: string;
  listing: {
    _id: string;
    title: string;
    price: number;
    coverImage: string | null;
    images: string[];
    game: { _id: string; name: string } | null;
    status: string;
  } | null;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
}

interface CampaignListing extends Listing {
  campaignDiscount?: {
    type: 'mandatory' | 'voluntary';
    discountPercent: number;
    originalPrice?: number;
    discountedPrice?: number;
    label: string;
  };
}

interface ActiveCampaign {
  _id: string;
  title: string;
  description: string;
  type: 'mandatory' | 'voluntary';
  image: string;
  discountPercent: number;
  games: { _id: string; name: string; slug: string; icon?: string }[];
  endDate: string;
  listings: CampaignListing[];
  listingCount: number;
}

/* ═══════════ STATIC DEMO DATA ═══════════ */

/* ═══════════ EMPTY STATE COMPONENT ═══════════ */
function EmptyGameSection({ gameName, isSeller }: { gameName: string; isSeller?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-white/20" />
      </div>
      <h3 className="text-base font-semibold text-white/60 mb-2">
        No accounts available currently
      </h3>
      <p className="text-sm text-white/30 text-center mb-5">
        {isSeller
          ? `Start adding ${gameName} accounts from the seller dashboard`
          : `No ${gameName} accounts listed yet`}
      </p>
      {isSeller && (
        <Link href="/user/store/new">
          <Button className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Add New Account
          </Button>
        </Link>
      )}
    </div>
  );
}

/* ═══════════ HORIZONTAL SCROLL COMPONENT ═══════════ */
function HorizontalScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll, { passive: true });
      checkScroll();
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Left fade + button */}
      <div className={`absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-[#060811] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
      <button
        onClick={() => scroll('left')}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-110 shadow-xl ${canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
        {children}
      </div>

      {/* Right fade + button */}
      <div className={`absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#060811] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
      <button
        onClick={() => scroll('right')}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-110 shadow-xl ${canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ═══════════ DYNAMIC PRODUCT CARD (from API) ═══════════ */
function ProductCard({ listing, currentUserId, discount, gridMode, isFavorited, onToggleFavorite }: { listing: Listing; currentUserId?: string; discount?: ActiveDiscount; gridMode?: boolean; isFavorited?: boolean; onToggleFavorite?: (id: string, e: React.MouseEvent) => void }) {
  const isOwner = !!(currentUserId && listing.seller && listing.seller._id === currentUserId);

  // Individual discount (from Discounts API) takes priority, then campaign discount (from listing.discount)
  const hasIndividualDiscount = discount && discount.listing?._id === listing._id;
  const hasCampaignDiscount = !hasIndividualDiscount && !!listing.discount;
  const hasDiscount = hasIndividualDiscount || hasCampaignDiscount;

  const discountPercent = hasIndividualDiscount ? discount.discountPercent
    : hasCampaignDiscount ? listing.discount!.discountPercent : 0;
  const originalPrice = hasIndividualDiscount ? discount.originalPrice
    : hasCampaignDiscount ? listing.discount!.originalPrice : listing.price;
  const displayPrice = hasIndividualDiscount ? discount.discountedPrice
    : hasCampaignDiscount ? listing.discount!.discountedPrice : listing.price;

  // Helper to get full avatar URL
  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/uploads/')) return avatar;
    return avatar;
  };

  return (
    <Link
      href={`/listings/${listing._id}`}
      className={`group/card relative isolate ${gridMode ? '' : 'flex-shrink-0 w-[280px]'}`}
    >
      {/* Hover border glow - Enhanced */}
      <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover/card:from-cyan-500/40 group-hover/card:via-blue-500/30 group-hover/card:to-purple-500/40 transition-all duration-700 opacity-0 group-hover/card:opacity-100 blur-xl" />

      <div className="relative bg-gradient-to-b from-[#0f1425] to-[#0a0d18] rounded-3xl border border-white/[0.08] group-hover/card:border-white/[0.15] overflow-hidden transition-all duration-500 group-hover/card:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] group-hover/card:-translate-y-2">
        <div className="relative aspect-[5/4] overflow-hidden">
          {listing.coverImage || listing.images?.length > 0 ? (
            <img src={listing.coverImage || listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-1000 ease-out" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500/[0.08] to-purple-500/[0.04] flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-white/[0.08]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d18] via-[#0a0d18]/50 to-transparent" />

          {/* Top row badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            {isOwner ? (
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-2xl">
                MY LISTING
              </span>
            ) : hasDiscount ? (
              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1">
                <Zap className="w-3 h-3" /> -{discountPercent}%
              </span>
            ) : null}
            {!isOwner && onToggleFavorite && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(listing._id, e); }}
                className={`ml-auto w-7 h-7 rounded-lg backdrop-blur-md flex items-center justify-center transition-all ${isFavorited ? 'bg-pink-500/30 text-pink-400' : 'bg-black/40 text-white/50 hover:text-pink-400 hover:bg-pink-500/20'}`}
                title={isFavorited ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-bold text-white/90 line-clamp-2 min-h-[40px] group-hover/card:text-white transition-colors leading-tight mb-3">
            {listing.title}
          </h3>

          {/* Seller Info */}
          {listing.seller && !isOwner && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                {listing.seller.avatar ? (
                  <img
                    src={getAvatarUrl(listing.seller.avatar) || ''}
                    alt={listing.seller.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initial if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-white/20 text-[8px] font-bold ${listing.seller.avatar ? 'hidden' : ''}`}>
                  {listing.seller.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="text-[9px] text-white/50 font-medium">@{listing.seller.username}</span>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2">
            {listing.game && <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{listing.game.name}</span>}
            <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">GLOBAL</span>
          </div>
          <div className="flex items-end justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <div>
              {hasDiscount && <p className="text-[10px] text-white/20 line-through">EGP {originalPrice.toFixed(2)}</p>}
              <p className="text-base font-black text-white">EGP {displayPrice.toFixed(2)}</p>
            </div>
          </div>
          {!isOwner && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-[12px] font-bold py-2 rounded-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Buy Now
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ═══════════ SECTION HEADER ═══════════ */
function SectionHeader({ icon: Icon, title, color, subtitle, isExpanded, onToggle }: { icon: React.ElementType; title: string; color: string; subtitle?: string; isExpanded?: boolean; onToggle?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color} blur-lg opacity-30`} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-[10px] text-white/25 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onToggle && (
        <button
          onClick={onToggle}
          className={`text-[12px] font-semibold flex items-center gap-1.5 px-4 py-2 rounded-xl border transition-all duration-300 group ${isExpanded
            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/25'
            : 'text-white/30 border-white/[0.06] hover:text-cyan-400 hover:bg-white/[0.04] hover:border-cyan-500/15'
            }`}
        >
          {isExpanded ? (
            <>
              <X className="w-3.5 h-3.5" />
              Show Less
            </>
          ) : (
            <>
              <LayoutGrid className="w-3.5 h-3.5" />
              View All
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════ BETWEEN-GAMES AD BANNER ═══════════ */
function BetweenGamesAd({ ad }: { ad: DashboardAd }) {
  const handleClick = () => {
    fetch(`/api/v1/ads/${ad._id}/click`, { method: 'POST' }).catch(() => { });
  };

  const Wrapper = ad.link ? 'a' : 'div';
  const wrapperProps = ad.link
    ? { href: ad.link, target: '_blank' as const, rel: 'noopener noreferrer', onClick: handleClick }
    : {};

  return (
    <section className="relative group">
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 cursor-pointer"
      >
        {/* Full-width image */}
        <div className="relative w-full aspect-[4/1] sm:aspect-[5/1] md:aspect-[6/1] overflow-hidden">
          <img
            src={ad.image}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-0 flex items-center justify-between px-6 sm:px-8 md:px-12">
            <div className="max-w-[60%]">
              <h3 className="text-white font-bold text-sm sm:text-base md:text-lg drop-shadow-lg truncate">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-white/60 text-[11px] sm:text-xs mt-1 line-clamp-1 drop-shadow">
                  {ad.description}
                </p>
              )}
            </div>

            {ad.link && (
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[11px] sm:text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                Learn More
                <ChevronRight className="w-3 h-3 inline-block mr-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </div>

          {/* Ad badge */}
          <span className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white/50 text-[8px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border border-white/10">
            AD
          </span>
        </div>
      </Wrapper>
    </section>
  );
}

/* ═══════════ GAME COLOR MAPPING ═══════════ */
const GAME_COLORS: Record<string, string> = {
  'valorant': 'from-red-500 to-pink-600',
  'pubg': 'from-amber-500 to-orange-600',
  'fifa': 'from-green-500 to-emerald-600',
  'league of legends': 'from-purple-500 to-indigo-600',
  'fortnite': 'from-blue-500 to-cyan-600',
  'arc raiders': 'from-rose-500 to-red-600',
};

function getGameColor(gameName: string): string {
  const normalized = gameName.toLowerCase();
  return GAME_COLORS[normalized] || 'from-cyan-500 to-blue-600';
}

/* ═══════════ INLINE FILTER BAR ═══════════ */
function InlineFilterBar({ searchQuery, setSearchQuery, sortBy, setSortBy, priceRange, setPriceRange }: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (v: { min: string; max: string }) => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this section..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all duration-300"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setSortOpen(!sortOpen); setPriceOpen(false); }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOptions.find(s => s.value === sortBy)?.label || 'Sort'}
            <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl bg-[#12162a] border border-white/[0.08] shadow-2xl shadow-black/50 z-50 py-1.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${sortBy === opt.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price filter */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setPriceOpen(!priceOpen); setSortOpen(false); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] font-medium border transition-all duration-200 ${priceRange.min || priceRange.max
              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
              : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Price
          </button>
          {priceOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-56 rounded-xl bg-[#12162a] border border-white/[0.08] shadow-2xl shadow-black/50 z-50 p-3">
              <p className="text-[11px] text-white/30 mb-2 font-medium">Price Range</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-[11px] text-white/25">$</span>
                  <input type="number" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} placeholder="Min" className="w-full bg-transparent text-white text-[12px] placeholder:text-white/15 focus:outline-none" />
                </div>
                <span className="text-white/15 text-[11px]">—</span>
                <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-[11px] text-white/25">$</span>
                  <input type="number" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} placeholder="Max" className="w-full bg-transparent text-white text-[12px] placeholder:text-white/15 focus:outline-none" />
                </div>
              </div>
              {(priceRange.min || priceRange.max) && (
                <button onClick={() => setPriceRange({ min: '', max: '' })} className="text-[11px] text-red-400/60 hover:text-red-400 mt-2 transition-colors">
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clear all filters */}
        {(searchQuery || sortBy !== 'default' || priceRange.min || priceRange.max) && (
          <button
            onClick={() => { setSearchQuery(''); setSortBy('default'); setPriceRange({ min: '', max: '' }); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-medium text-red-400/60 hover:text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all duration-200"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════ FILTER & SORT HELPER ═══════════ */
function useProductFilter(products: any[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const filtered = products.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.game.toLowerCase().includes(q) && !p.platform.toLowerCase().includes(q)) return false;
    }
    if (priceRange.min && p.price < parseFloat(priceRange.min)) return false;
    if (priceRange.max && p.price > parseFloat(priceRange.max)) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      case 'popular': return b.sold - a.sold;
      default: return 0;
    }
  });

  return { filtered, searchQuery, setSearchQuery, sortBy, setSortBy, priceRange, setPriceRange };
}

/* ═══════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════ */
export default function UserDashboardPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [popularListings, setPopularListings] = useState<Listing[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [dashboardAds, setDashboardAds] = useState<DashboardAd[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Filter hooks removed - static data removed, using dynamic data from API

  // Fetch favorite IDs once when user is available
  useEffect(() => {
    if (!user) return;
    fetch('/api/v1/favorites/ids', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.data) setFavoriteIds(new Set(data.data)); })
      .catch(() => { });
  }, [user]);

  const handleToggleFavorite = useCallback(async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const csrfToken = await ensureCsrfToken() || '';
      const res = await fetch(`/api/v1/favorites/${listingId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-XSRF-TOKEN': csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (data.favorited) next.add(listingId); else next.delete(listingId);
          return next;
        });
      }
    } catch { /* silent */ }
  }, [user]);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // ═══ DYNAMIC GAME LISTINGS ═══
  const [gameListings, setGameListings] = useState<Record<string, Listing[]>>({});

  // ═══ OPTIMIZED: Fetch all data in parallel with in-memory SWR cache ═══
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch critical data in parallel with SWR caching (instant on revisit)
        const [gamesData, adsData, discountsData, campaignsData] = await fetchParallel([
          { url: '/api/v1/games', options: { ttl: 300_000, tags: ['games'] } },
          { url: '/api/v1/ads/active', options: { ttl: 120_000, tags: ['ads'] } },
          { url: '/api/v1/discounts/active', options: { ttl: 120_000, tags: ['discounts'] } },
          { url: '/api/v1/campaigns/active', options: { ttl: 120_000, tags: ['campaigns'] } },
        ]);

        let gameListingsData: Record<string, Listing[]> = {};

        // Set games and fetch their listings
        if (gamesData.data) {
          setGames(gamesData.data);

          // Fetch listings for all games in parallel with per-game caching
          const allListings = await Promise.all(
            gamesData.data.map((game: Game) =>
              fetchData(`/api/v1/listings/browse?game=${game._id}&limit=12&sort=newest`, {
                ttl: 60_000, // 1 min cache per game listings
                tags: ['listings', `game:${game._id}`],
              })
                .then((data: any) => ({ gameId: game._id, listings: data.data || [] }))
                .catch(() => ({ gameId: game._id, listings: [] }))
            )
          );
          allListings.forEach(({ gameId, listings }: any) => {
            gameListingsData[gameId] = listings;
          });
          setGameListings(gameListingsData);
        }

        // Set ads
        if (adsData.data) setDashboardAds(adsData.data);

        // Set discounts
        if (discountsData.data) setActiveDiscounts(discountsData.data);

        // Set campaigns
        if (campaignsData.data) setActiveCampaigns(campaignsData.data);

        // Fetch rankings separately (non-blocking, cached 2 min)
        fetchData('/api/v1/rankings/homepage?limit=10', {
          ttl: 120_000,
          tags: ['rankings'],
          timeout: 5000,
        })
          .then((rankingsData: any) => {
            if (rankingsData.success && rankingsData.data) {
              setListings(rankingsData.data.bestSeller || []);
              setTrendingListings(rankingsData.data.trending || []);
              setPopularListings(rankingsData.data.popular || []);
            }
          })
          .catch(() => { });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []); // Run only once on mount

  // Split ads by position
  const heroAds = dashboardAds.filter(ad => ad.position === 'hero');
  const betweenGamesAds = dashboardAds.filter(ad => ad.position === 'between_games');

  // Pick ONE random slot between game sections to show an ad (stable across re-renders)
  const randomAdSlot = useMemo(() => {
    return games.length > 1 ? Math.floor(Math.random() * (games.length - 1)) : -1;
  }, [games.length]);

  // Create a map of listing ID to discount for efficient lookup
  const discountMap = activeDiscounts.reduce((map, discount) => {
    if (discount.listing?._id) {
      map[discount.listing._id] = discount;
    }
    return map;
  }, {} as Record<string, ActiveDiscount>);

  // ═══ GAME FILTER LOGIC ═══
  const filteredGames = useMemo(() => {
    if (selectedGameFilter === 'all') return games;
    return games.filter(g => g._id === selectedGameFilter);
  }, [games, selectedGameFilter]);

  const filteredDiscounts = useMemo(() => {
    if (selectedGameFilter === 'all') return activeDiscounts;
    return activeDiscounts.filter(d => d.listing?.game?._id === selectedGameFilter);
  }, [activeDiscounts, selectedGameFilter]);

  const filteredCampaigns = useMemo(() => {
    if (selectedGameFilter === 'all') return activeCampaigns;
    return activeCampaigns.filter(c => c.games.some(g => g._id === selectedGameFilter));
  }, [activeCampaigns, selectedGameFilter]);

  const filteredBestSellers = useMemo(() => {
    if (selectedGameFilter === 'all') return listings;
    return listings.filter(l => l.game?._id === selectedGameFilter);
  }, [listings, selectedGameFilter]);

  const filteredTrending = useMemo(() => {
    if (selectedGameFilter === 'all') return trendingListings;
    return trendingListings.filter(l => l.game?._id === selectedGameFilter);
  }, [trendingListings, selectedGameFilter]);

  const filteredPopular = useMemo(() => {
    if (selectedGameFilter === 'all') return popularListings;
    return popularListings.filter(l => l.game?._id === selectedGameFilter);
  }, [popularListings, selectedGameFilter]);

  return (
    <UserDashboardLayout>
      <div className="min-h-screen pb-28 space-y-10">

        {/* ═══════════ HERO WELCOME SECTION ═══════════ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1225] via-[#0f1630] to-[#0a0f20] border border-white/[0.04] p-6 sm:p-8">
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.04] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/[0.04] rounded-full blur-[60px]" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Welcome back! <span className="inline-block animate-[float_3s_ease-in-out_infinite]">👋</span>
              </h1>
              <p className="text-sm text-white/30 mt-1">Find the best deals on gaming accounts & digital goods</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick stats pills */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-[11px] font-semibold text-white/60">12K+ Products</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-[11px] font-semibold text-white/60">Verified Sellers</span>
              </div>
            </div>
          </div>

          {/* Platform Tabs inside hero */}
          <div className="relative flex items-center gap-2 mt-6 overflow-x-auto scrollbar-hide pb-1">
            {/* "All" tab */}
            <button
              onClick={() => setSelectedGameFilter('all')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 ${selectedGameFilter === 'all'
                ? 'bg-white/[0.1] text-white shadow-lg border border-white/[0.1]'
                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
            >
              {selectedGameFilter === 'all' && <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-15" />}
              <Gamepad2 className="w-4 h-4 relative z-10" />
              <span className="relative z-10">All</span>
            </button>
            {/* Dynamic game tabs */}
            {games.map((game) => {
              const isActive = selectedGameFilter === game._id;
              const gameColor = getGameColor(game.name);
              return (
                <button
                  key={game._id}
                  onClick={() => setSelectedGameFilter(game._id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 ${isActive
                    ? 'bg-white/[0.1] text-white shadow-lg border border-white/[0.1]'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                >
                  {isActive && <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${gameColor} opacity-15`} />}
                  <Gamepad2 className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{game.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══════════ ADMIN ADS HERO CAROUSEL ═══════════ */}
        {heroAds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-red-500" />
              <span className="text-[11px] text-white/25 font-semibold uppercase tracking-widest">Sponsored</span>
            </div>
            <HorizontalScroll>
              {heroAds.map((ad) => (
                <a
                  key={ad._id}
                  href={ad.link || '#'}
                  target={ad.link ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  onClick={() => { fetch(`/api/v1/ads/${ad._id}/click`, { method: 'POST' }).catch(() => { }); }}
                  className="flex-shrink-0 relative w-[300px] md:w-[380px] aspect-[16/9] rounded-2xl overflow-hidden group border border-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
                >
                  <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-sm truncate">{ad.title}</h3>
                    {ad.description && <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1">{ad.description}</p>}
                  </div>
                  <span className="absolute top-2.5 right-2.5 bg-white/[0.08] backdrop-blur-sm text-white/40 text-[8px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Ad</span>
                </a>
              ))}
            </HorizontalScroll>
          </section>
        )}



        {/* ═══════════ DISCOUNTED PRODUCTS (FROM ADMIN) ═══════════ */}
        {filteredDiscounts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Percent className="w-4 h-4 text-white" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 blur-lg opacity-30" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                    Flash Deals
                    <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/15 animate-pulse">
                      LIMITED
                    </span>
                  </h2>
                  <p className="text-[10px] text-white/20 mt-0.5">Exclusive discounts, grab before they're gone</p>
                </div>
              </div>
              <Link href="/user" className="text-[11px] text-white/25 hover:text-red-400 transition-colors font-medium flex items-center gap-1 group">
                View All
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <HorizontalScroll>
              {filteredDiscounts.map((disc) => {
                if (!disc.listing) return null;
                const coverImg = disc.listing.coverImage || (disc.listing.images?.length > 0 ? disc.listing.images[0] : null);
                return (
                  <Link
                    key={disc._id}
                    href={`/listings/${disc.listing._id}`}
                    className="group flex-shrink-0 w-[200px] bg-[#0c0f18] rounded-2xl border border-red-500/[0.06] hover:border-red-500/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/[0.07] hover:-translate-y-1.5 relative"
                  >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500 z-10" />

                    <div className="relative aspect-[4/3] overflow-hidden">
                      {coverImg ? (
                        <img src={coverImg} alt={disc.listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
                          <Gamepad2 className="w-10 h-10 text-white/[0.06]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      </span>
                      <span className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg animate-pulse">
                        -{disc.discountPercent}%
                      </span>
                    </div>

                    <div className="p-3">
                      <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-red-300 transition-colors leading-tight">
                        {disc.listing.title}
                      </h3>
                      {disc.listing.game && (
                        <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                          {disc.listing.game.name}
                        </span>
                      )}
                      <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
                        <div>
                          <p className="text-[10px] text-white/20 line-through">EGP {disc.originalPrice.toFixed(2)}</p>
                          <p className="text-base font-black text-red-400">EGP {disc.discountedPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/15 text-red-400 text-[9px] font-black px-2 py-1 rounded-lg">
                          DEAL
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </HorizontalScroll>
          </section>
        )}

        {/* ═══════════ CAMPAIGN DISCOUNT SECTIONS ═══════════ */}
        {filteredCampaigns.map((campaign) => {
          const isMandatory = campaign.type === 'mandatory';
          const gradientColor = isMandatory ? 'from-orange-500 to-amber-600' : 'from-blue-500 to-cyan-600';
          const badgeColor = isMandatory ? 'bg-orange-500/15 text-orange-400 border-orange-500/15' : 'bg-blue-500/15 text-blue-400 border-blue-500/15';
          const endDate = new Date(campaign.endDate);
          const timeLeft = endDate.getTime() - Date.now();
          const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

          return (
            <section key={campaign._id}>
              {/* Campaign Banner */}
              {campaign.image && (
                <div className="relative w-full aspect-[5/1] sm:aspect-[6/1] rounded-2xl overflow-hidden mb-4 border border-white/[0.06]">
                  <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-end justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-lg">{campaign.title}</h2>
                      {campaign.description && <p className="text-white/50 text-xs mt-1 line-clamp-1">{campaign.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow-lg">
                        -{campaign.discountPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section header when no image */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg`}>
                    <Percent className="w-4 h-4 text-white" />
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradientColor} blur-lg opacity-30`} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                      {!campaign.image && campaign.title}
                      {campaign.image && `${campaign.title} — Accounts`}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {isMandatory ? 'Commission Discount' : 'Price Discount'}
                      </span>
                      {daysLeft <= 3 && (
                        <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/15 animate-pulse">
                          {daysLeft === 0 ? 'Last Day!' : `${daysLeft} days left`}
                        </span>
                      )}
                    </h2>
                    <p className="text-[10px] text-white/20 mt-0.5 flex items-center gap-2">
                      {campaign.games.map(g => g.name).join(' • ')}
                      <span className="text-white/10">|</span>
                      <span>{campaign.listingCount} accounts</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Campaign Listings */}
              <HorizontalScroll>
                {campaign.listings.map((listing) => {
                  const cd = listing.campaignDiscount;
                  const coverImg = listing.coverImage || (listing.images?.length > 0 ? listing.images[0] : null);
                  const displayPrice = cd?.discountedPrice ? cd.discountedPrice : listing.price;
                  const originalPrice = cd?.originalPrice ? cd.originalPrice : listing.price;
                  const hasRealDiscount = !!cd?.discountedPrice;

                  return (
                    <Link
                      key={listing._id}
                      href={`/listings/${listing._id}`}
                      className={`group flex-shrink-0 w-[220px] bg-[#0c0f18] rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 relative ${isMandatory
                        ? 'border-orange-500/[0.06] hover:border-orange-500/20 hover:shadow-orange-500/[0.07]'
                        : 'border-blue-500/[0.06] hover:border-blue-500/20 hover:shadow-blue-500/[0.07]'
                        }`}
                    >
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${isMandatory ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500'}`} />

                      <div className="relative aspect-[5/4] overflow-hidden">
                        {coverImg ? (
                          <img src={coverImg} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
                            <Gamepad2 className="w-10 h-10 text-white/[0.06]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />

                        {/* Discount badge */}
                        <span className={`absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg ${isMandatory ? 'bg-orange-500' : 'bg-blue-500'}`}>
                          -{cd?.discountPercent || campaign.discountPercent}%
                        </span>

                        {/* Shield */}
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                          <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        </span>

                        {/* Type label */}
                        <span className={`absolute bottom-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm ${isMandatory ? 'bg-orange-500/20 text-orange-300 border border-orange-500/20' : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'}`}>
                          {isMandatory ? 'Reduced Commission' : 'Discounted Price'}
                        </span>
                      </div>

                      <div className="p-3">
                        <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-white transition-colors leading-tight">
                          {listing.title}
                        </h3>

                        {listing.seller && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-[9px] text-white/40">@{listing.seller.username}</span>
                          </div>
                        )}

                        {listing.game && (
                          <span className="text-[9px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium mt-1.5 inline-block">
                            {listing.game.name}
                          </span>
                        )}

                        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
                          <div>
                            {hasRealDiscount && <p className="text-[10px] text-white/20 line-through">EGP {originalPrice.toFixed(2)}</p>}
                            <p className={`text-base font-black ${isMandatory ? 'text-orange-400' : 'text-blue-400'}`}>
                              EGP {displayPrice.toFixed(2)}
                            </p>
                          </div>
                          <div className={`text-[8px] font-bold px-2 py-1 rounded-lg border ${isMandatory
                            ? 'bg-orange-500/10 border-orange-500/15 text-orange-400'
                            : 'bg-blue-500/10 border-blue-500/15 text-blue-400'
                            }`}>
                            {isMandatory ? 'DEAL' : 'SALE'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalScroll>
            </section>
          );
        })}

        {/* ═══════════ 🔥 BEST SELLERS (RANKED BY ALGORITHM) ═══════════ */}
        {filteredBestSellers.length > 0 && (
          <section>
            <SectionHeader icon={Flame} title="Best Sellers" color="from-orange-500 to-red-500" subtitle="Top performing accounts by sales" />
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
                  <span className="text-[11px] text-white/20">Loading best sellers...</span>
                </div>
              </div>
            ) : (
              <HorizontalScroll>
                {filteredBestSellers.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} discount={discountMap[listing._id]} isFavorited={favoriteIds.has(listing._id)} onToggleFavorite={handleToggleFavorite} />
                ))}
              </HorizontalScroll>
            )}
          </section>
        )}

        {/* ═══════════ DYNAMIC GAME SECTIONS (WITH ADS BETWEEN) ═══════════ */}
        {filteredGames.map((game, index) => {
          const listings = gameListings[game._id] || [];
          const gameColor = getGameColor(game.name);
          // Show a between_games ad only at one random slot
          const adForThisGap = betweenGamesAds.length > 0 && index === randomAdSlot
            ? betweenGamesAds[Math.floor(Math.random() * betweenGamesAds.length)]
            : null;

          return (
            <div key={game._id} className="space-y-10">
              <section>
                <SectionHeader
                  icon={Gamepad2}
                  title={`${game.name} Accounts`}
                  color={gameColor}
                  subtitle={`Premium ${game.name} accounts`}
                />
                {listings.length > 0 ? (
                  <HorizontalScroll>
                    {listings.map((listing) => (
                      <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} discount={discountMap[listing._id]} isFavorited={favoriteIds.has(listing._id)} onToggleFavorite={handleToggleFavorite} />
                    ))}
                  </HorizontalScroll>
                ) : (
                  <EmptyGameSection gameName={game.name} isSeller={user?.role === 'seller'} />
                )}
              </section>

              {/* Between-games ad banner */}
              {adForThisGap && <BetweenGamesAd ad={adForThisGap} />}
            </div>
          );
        })}

        {/* ═══════════ TRUST BADGES - Minimal ═══════════ */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-fuchsia-600/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(168,85,247,0.15),transparent_60%)]" />

          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

          <div className="relative flex flex-col md:flex-row-reverse items-center">
            {/* Right Visual - Crown Icon */}
            <div className="relative w-full md:w-2/5 h-48 md:h-60 flex items-center justify-center overflow-hidden">
              <div className="relative">
                {/* Main Crown */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 group hover:shadow-purple-500/50 transition-all duration-700 hover:scale-105">
                  <Crown className="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-2xl" />
                  {/* Inner glow */}
                  <div className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-white/20 to-transparent" />
                </div>
                {/* Orbiting particles */}
                <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg shadow-amber-500/50 animate-pulse" />
                <div className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg shadow-purple-500/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <Sparkles className="absolute top-8 -left-8 w-5 h-5 text-yellow-400 animate-[spin_4s_linear_infinite]" />
              </div>
            </div>

            {/* Left Content */}
            <div className="w-full md:w-3/5 p-8 md:p-10 text-center md:text-left">
              <div className="inline-block mb-4">
                <span className="text-[11px] font-bold text-purple-300 bg-purple-500/20 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-purple-400/30">Premium Membership</span>
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                SEAL<span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">+</span>PASS
              </h3>

              <p className="text-white/50 text-base leading-relaxed max-w-md mb-6">
                Unlock exclusive benefits and save <span className="text-amber-400 font-bold">up to 25%</span> on every purchase
              </p>

              <div className="flex flex-wrap gap-3 mb-6 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-xs font-medium">Early Access</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span className="text-white/70 text-xs font-medium">Priority Support</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span className="text-white/70 text-xs font-medium">Exclusive Deals</span>
                </div>
              </div>

              <div className="flex items-end gap-3 justify-center md:justify-start mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-white/40 text-sm">Starting at</span>
                  <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">$2.49</span>
                  <span className="text-lg text-white/40 font-medium">/month</span>
                </div>
              </div>

              <button className="group relative w-full md:w-auto bg-gradient-to-r from-amber-400 via-orange-500 to-pink-600 text-white font-bold px-10 py-4 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2.5 text-base">
                  <Zap className="w-5 h-5" />
                  Get SEAL+PASS Now
                </span>
              </button>

              <p className="text-white/20 text-[11px] mt-4 font-medium">✓ Cancel anytime • No hidden fees • Instant activation</p>
            </div>
          </div>
        </section>

        {/* ═══════════ LIVE LISTINGS (FROM API) ═══════════ */}
        {filteredBestSellers.length > 0 && (
          <section>
            <SectionHeader icon={Sparkles} title="Latest Listings" color="from-cyan-500 to-blue-600" subtitle="Fresh from our sellers" isExpanded={expandedSection === 'latest'} onToggle={() => toggleSection('latest')} />
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                  <span className="text-[11px] text-white/20">Loading trending...</span>
                </div>
              </div>
            ) : expandedSection === 'latest' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                {filteredBestSellers.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} gridMode isFavorited={favoriteIds.has(listing._id)} onToggleFavorite={handleToggleFavorite} />
                ))}
              </div>
            ) : (
              <HorizontalScroll>
                {filteredTrending.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} discount={discountMap[listing._id]} isFavorited={favoriteIds.has(listing._id)} onToggleFavorite={handleToggleFavorite} />
                ))}
              </HorizontalScroll>
            )}
          </section>
        )}

        {/* ═══════════ ⭐ POPULAR (RANKED BY ALGORITHM) ═══════════ */}
        {filteredPopular.length > 0 && (
          <section>
            <SectionHeader icon={Star} title="Most Popular" color="from-amber-500 to-yellow-600" subtitle="Community favorites" />
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                  <span className="text-[11px] text-white/20">Loading popular...</span>
                </div>
              </div>
            ) : (
              <HorizontalScroll>
                {filteredPopular.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} discount={discountMap[listing._id]} isFavorited={favoriteIds.has(listing._id)} onToggleFavorite={handleToggleFavorite} />
                ))}
              </HorizontalScroll>
            )}
          </section>
        )}

        {/* ═══════════ TRUST BADGES - Minimal ═══════════ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { icon: ShieldCheck, title: 'Secure Payments', desc: 'Protected transactions', color: 'text-emerald-400' },
            { icon: Zap, title: 'Instant Delivery', desc: 'Get accounts instantly', color: 'text-amber-400' },
            { icon: Headphones, title: '24/7 Support', desc: 'Always available', color: 'text-blue-400' },
            { icon: Gift, title: 'Best Deals', desc: 'Unbeatable prices', color: 'text-pink-400' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${feature.color}`}>
                <feature.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white/80">{feature.title}</p>
                <p className="text-[10px] text-white/20">{feature.desc}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </UserDashboardLayout>
  );
}

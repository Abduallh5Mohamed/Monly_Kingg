'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Trash2,
  Eye,
  Loader2,
  Store,
  Gamepad2,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Zap,
  Calendar,
  CheckCircle,
  Star,
  ShoppingCart,
  Flame,
  Sparkles,
  TrendingDown,
  Crown,
} from 'lucide-react';

interface Listing {
  _id: string;
  title: string;
  game: { _id: string; name: string } | string;
  description: string;
  price: number;
  details: any;
  images: string[];
  coverImage: string;
  status: 'available' | 'sold';
  createdAt: string;
}

interface Stats {
  totalListings: number;
  activeListings: number;
  soldListings: number;
}

// Badge styles per game type
const GAME_BADGES: Record<string, { color: string; label: string }> = {
  'League of Legends': { color: 'bg-blue-500', label: 'RIOT' },
  'Valorant': { color: 'bg-red-500', label: 'RIOT EUW' },
  'PUBG Mobile': { color: 'bg-yellow-500', label: 'GLOBAL' },
  'FIFA / FC': { color: 'bg-green-500', label: 'EA FC 25' },
};

// Promo badge options
const PROMO_BADGES = [
  { label: 'TRENDING', color: 'bg-emerald-500', icon: TrendingUp },
  { label: 'HOT', color: 'bg-red-500', icon: Flame },
  { label: 'NEW', color: 'bg-cyan-500', icon: Sparkles },
  { label: 'POPULAR', color: 'bg-purple-500', icon: Crown },
];

function getPromoBadge(index: number) {
  return PROMO_BADGES[index % PROMO_BADGES.length];
}

// Generate consistent discount based on listing ID (no Math.random to avoid hydration errors)
function getDiscountForListing(listingId: string) {
  const discounts = [20, 25, 27, 30, 33, 35];
  // Use simple hash of listing ID to get consistent discount
  let hash = 0;
  for (let i = 0; i < listingId.length; i++) {
    hash = ((hash << 5) - hash) + listingId.charCodeAt(i);
    hash = hash & hash;
  }
  return discounts[Math.abs(hash) % discounts.length];
}

// Generate consistent rating based on listing ID
function getRatingForListing(listingId: string) {
  let hash = 0;
  for (let i = 0; i < listingId.length; i++) {
    hash = ((hash << 5) - hash) + listingId.charCodeAt(i);
    hash = hash & hash;
  }
  const rating = 4.5 + (Math.abs(hash) % 5) / 10; // 4.5 to 4.9
  return rating.toFixed(1);
}

// Generate consistent review count based on listing ID
function getReviewCountForListing(listingId: string) {
  let hash = 0;
  for (let i = 0; i < listingId.length; i++) {
    hash = ((hash << 5) - hash) + listingId.charCodeAt(i);
    hash = hash & hash;
  }
  return 80 + (Math.abs(hash) % 200); // 80 to 280
}

export default function SellerStorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({ totalListings: 0, activeListings: 0, soldListings: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Promote modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteListing, setPromoteListing] = useState<Listing | null>(null);
  const [promoteDays, setPromoteDays] = useState(3);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState(false);
  const PRICE_PER_DAY = 2;

  useEffect(() => {
    if (!authLoading && (!user || !user.isSeller)) {
      router.push('/user/dashboard');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.isSeller) {
      fetchListings();
      fetchStats();
    }
  }, [user, filter, page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/listings/my-listings?status=${filter}&page=${page}&limit=10`, { credentials: 'include' });
      const data = await res.json();
      if (data.data) {
        setListings(data.data);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/listings/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.data) setStats(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/v1/listings/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const openPromoteModal = (listing: Listing) => {
    setPromoteListing(listing);
    setPromoteDays(3);
    setPromoteSuccess(false);
    setShowPromoteModal(true);
  };

  const handlePromote = async () => {
    if (!promoteListing) return;
    setPromoteLoading(true);
    try {
      const res = await fetch('/api/v1/promotions/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: promoteListing._id,
          days: promoteDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoteSuccess(true);
        setTimeout(() => {
          setShowPromoteModal(false);
          setPromoteSuccess(false);
        }, 2000);
      } else {
        alert(data.message || 'Failed to submit promotion request');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit promotion request');
    } finally {
      setPromoteLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b14]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Listings', value: stats.totalListings, icon: Package, color: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
    { label: 'Active', value: stats.activeListings, icon: Eye, color: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
    { label: 'Sold', value: stats.soldListings, icon: DollarSign, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
  ];

  const getGameName = (listing: Listing) => {
    return typeof listing.game === 'object' ? listing.game.name : listing.game;
  };

  const getCoverImageUrl = (listing: Listing) => {
    if (listing.coverImage) return listing.coverImage;
    if (listing.images && listing.images.length > 0) return listing.images[0];
    return null;
  };

  return (
    <UserDashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Store className="w-8 h-8 text-cyan-400" />
              My Store
            </h1>
            <p className="text-white/50 mt-1">Manage your game account listings</p>
          </div>
          <Button
            onClick={() => router.push('/user/store/new')}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-3 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5 mr-2" /> New Listing
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-white/20 transition-all ${stat.shadow}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/40 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {['all', 'available', 'sold'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Listings Grid - Product Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-white/10" />
            <p className="text-white/40 text-lg">No listings yet</p>
            <p className="text-white/20 text-sm mt-1">Create your first listing to start selling</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing, index) => {
              const gameName = getGameName(listing);
              const coverUrl = getCoverImageUrl(listing);
              const promoBadge = getPromoBadge(index);
              const PromoBadgeIcon = promoBadge.icon;
              const discount = getDiscountForListing(listing._id);
              const originalPrice = Math.round(listing.price / (1 - discount / 100));
              const gameBadge = GAME_BADGES[gameName] || { color: 'bg-gray-500', label: gameName?.toUpperCase?.() || 'GAME' };
              const rating = getRatingForListing(listing._id);
              const reviewCount = getReviewCountForListing(listing._id);

              return (
                <div
                  key={listing._id}
                  className="group rounded-2xl overflow-hidden bg-[#1a1d2e]/40 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1a1d2e] to-[#0d1117]">
                    {coverUrl ? (
                      <img
                        src={coverUrl.startsWith('http') ? coverUrl : `http://localhost:5000${coverUrl}`}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* Fallback icon */}
                    <div className={`fallback-icon w-full h-full flex items-center justify-center ${coverUrl ? 'hidden' : ''}`}>
                      <Gamepad2 className="w-16 h-16 text-white/10" />
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent opacity-60" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <span className={`${promoBadge.color} ${promoBadge.textColor} text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-lg uppercase`}>
                        <PromoBadgeIcon className="w-3.5 h-3.5" />
                        {promoBadge.label}
                      </span>
                      <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-lg">
                        -{discount}%
                      </span>
                    </div>

                    {/* Game badge - top right */}
                    <div className="absolute top-3 right-3">
                      <span className="text-[11px] text-white/90 font-bold px-2.5 py-1 rounded-md uppercase tracking-wide bg-black/50 backdrop-blur-sm border border-white/20">
                        {gameBadge.label}
                      </span>
                    </div>

                    {/* Action buttons - show on hover */}
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {listing.status === 'available' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPromoteModal(listing); }}
                          className="w-9 h-9 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all"
                          title="Promote"
                        >
                          <Megaphone className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(listing._id); }}
                        disabled={deleteLoading === listing._id}
                        className="w-9 h-9 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete"
                      >
                        {deleteLoading === listing._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Status badge for sold items */}
                    {listing.status === 'sold' && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500/90 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-xl">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col bg-[#0d1117]">
                    {/* Title */}
                    <h3 className="text-base font-bold text-white mb-3 line-clamp-2 group-hover:text-cyan-300 transition-colors leading-tight">
                      {listing.title}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-white/90 font-bold">{rating}</span>
                      </div>
                      <span className="text-xs text-white/40">({reviewCount} reviews)</span>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">€{listing.price}</span>
                        <span className="text-sm text-white/30 line-through">€{originalPrice}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02]"
                      >
                        Buy Now
                      </button>
                      <button
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-white/60">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Promote Listing Modal */}
      {showPromoteModal && promoteListing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPromoteModal(false)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl">
            <button onClick={() => setShowPromoteModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="p-8">
              {promoteSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Request Submitted</h3>
                  <p className="text-white/50 text-sm">Your promotion request has been sent to admin for review</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    Promote Listing
                  </h2>
                  <p className="text-white/40 text-sm mb-6">Boost your listing visibility to more buyers</p>

                  {/* Listing Preview */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6">
                    <h3 className="text-white font-semibold text-sm">{promoteListing.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {typeof promoteListing.game === 'object' ? promoteListing.game.name : promoteListing.game}
                      </span>
                      <span>${promoteListing.price}</span>
                    </div>
                  </div>

                  {/* Days Selector */}
                  <div className="mb-6">
                    <label className="text-xs text-white/50 mb-3 block">Promotion Duration</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 7, 14].map((d) => (
                        <button
                          key={d}
                          onClick={() => setPromoteDays(d)}
                          className={`py-3 rounded-xl text-sm font-bold transition-all ${promoteDays === d
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>

                    {/* Custom days slider */}
                    <div className="mt-4">
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={promoteDays}
                        onChange={(e) => setPromoteDays(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                      <div className="flex justify-between text-[10px] text-white/30 mt-1">
                        <span>1 day</span>
                        <span>{promoteDays} days</span>
                        <span>30 days</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Duration</span>
                      <span className="text-white">{promoteDays} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Price per day</span>
                      <span className="text-white">${PRICE_PER_DAY}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                      <span className="text-white font-medium">Total Cost</span>
                      <span className="text-xl font-bold text-cyan-400">${promoteDays * PRICE_PER_DAY}</span>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3 mb-6">
                    <p className="text-xs text-cyan-400/70 leading-relaxed">
                      Your promotion request will be sent to admin for approval. Once approved, your listing will be featured and reach more buyers for the selected duration.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handlePromote}
                    disabled={promoteLoading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {promoteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2" />
                    )}
                    Submit Promotion Request - ${promoteDays * PRICE_PER_DAY}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </UserDashboardLayout>
  );
}

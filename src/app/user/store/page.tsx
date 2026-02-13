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
  Edit3,
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
} from 'lucide-react';

interface Listing {
  _id: string;
  title: string;
  game: { _id: string; name: string } | string;
  description: string;
  price: number;
  details: any;
  status: 'available' | 'sold';
  createdAt: string;
}

interface Stats {
  totalListings: number;
  activeListings: number;
  soldListings: number;
}

const GAMES = [
  'Valorant', 'PUBG', 'FIFA / FC', 'League of Legends', 'Call of Duty',
  'Apex Legends', 'Counter-Strike 2', 'Fortnite', 'Overwatch 2', 'Star Citizen'
];

export default function SellerStorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({ totalListings: 0, activeListings: 0, soldListings: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Promote modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteListing, setPromoteListing] = useState<Listing | null>(null);
  const [promoteDays, setPromoteDays] = useState(3);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState(false);
  const PRICE_PER_DAY = 2;

  // Form state
  const [form, setForm] = useState({
    title: '',
    game: '',
    description: '',
    price: '',
    details: {} as Record<string, string>,
  });

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

  const handleCreate = async () => {
    if (!form.title || !form.game || !form.price) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/v1/listings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          game: form.game,
          description: form.description,
          price: Number(form.price),
          details: form.details,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({ title: '', game: '', description: '', price: '', details: {} });
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
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

        {/* Listings Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div key={listing._id} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 hover:border-cyan-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-300/60">
                      {typeof listing.game === 'object' ? listing.game.name : listing.game}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${listing.status === 'available'
                      ? 'text-green-400 bg-green-400/10 border-green-400/20'
                      : 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                    }`}>
                    {listing.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">{listing.title}</h3>
                {listing.description && (
                  <p className="text-sm text-white/40 mb-4 line-clamp-2">{listing.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-xl font-bold text-cyan-400">${listing.price}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {listing.status === 'available' && (
                      <button
                        onClick={() => openPromoteModal(listing)}
                        className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all"
                        title="Promote"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(listing._id)}
                      disabled={deleteLoading === listing._id}
                      className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      {deleteLoading === listing._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-white/20 mt-2">
                  {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
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

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                New Listing
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Account Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Radiant Valorant Account"
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>

                {/* Game */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Game</label>
                  <select
                    value={form.game}
                    onChange={(e) => setForm(prev => ({ ...prev, game: e.target.value }))}
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-[#0f1419]">Select a game</option>
                    {GAMES.map((g) => (
                      <option key={g} value={g} className="bg-[#0f1419]">{g}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Price (USD)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="49.99"
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the account, rank, skins, etc..."
                    rows={3}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
                  />
                </div>

                {/* Dynamic Details */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Rank</label>
                  <input
                    value={form.details.rank || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, details: { ...prev.details, rank: e.target.value } }))}
                    placeholder="e.g. Radiant, Global Elite, Diamond..."
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Skins / Items Count</label>
                  <input
                    value={form.details.skins || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, details: { ...prev.details, skins: e.target.value } }))}
                    placeholder="e.g. 45 skins, 12 agents..."
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleCreate}
                  disabled={createLoading || !form.title || !form.game || !form.price}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {createLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-5 h-5 mr-2" />
                  )}
                  Create Listing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

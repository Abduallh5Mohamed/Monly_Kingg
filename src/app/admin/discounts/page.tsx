'use client';

import { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Loader2,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Tag,
  Calendar,
  Ban,
  Package,
  TrendingDown,
  Gamepad2,
  ShieldCheck,
} from 'lucide-react';

interface SearchListing {
  _id: string;
  title: string;
  price: number;
  coverImage: string | null;
  images: string[];
  game: { _id: string; name: string } | null;
  seller: { _id: string; username: string } | null;
  status: string;
}

interface DiscountItem {
  _id: string;
  listing: {
    _id: string;
    title: string;
    price: number;
    coverImage: string | null;
    images: string[];
    game: { name: string } | null;
    status: string;
  } | null;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  reason: string;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string | null;
  createdBy: { username: string } | null;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  totalSavings: number;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  active: { color: 'text-green-400', bg: 'bg-green-400/10' },
  expired: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  cancelled: { color: 'text-red-400', bg: 'bg-red-400/10' },
};

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchListing[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SearchListing | null>(null);

  // Form
  const [discountPercent, setDiscountPercent] = useState(10);
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDiscounts();
    fetchStats();
  }, [filter]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/discounts?status=${filter}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setDiscounts(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/discounts/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  };

  const searchListings = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/v1/discounts/search-listings?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {}
    finally { setSearchLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchListings(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openModal = () => {
    setSelectedListing(null);
    setSearchQuery('');
    setSearchResults([]);
    setDiscountPercent(10);
    setReason('');
    setEndDate('');
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!selectedListing) {
      setToast({ type: 'error', msg: 'Please select a listing' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedListing._id,
          discountPercent,
          reason,
          endDate: endDate || null,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', msg: 'Discount created!' });
        setShowModal(false);
        fetchDiscounts();
        fetchStats();
      } else {
        setToast({ type: 'error', msg: data.message || 'Failed' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error' });
    }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/discounts/${id}/cancel`, { method: 'PUT', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', msg: 'Discount cancelled' });
        fetchDiscounts();
        fetchStats();
      }
    } catch {
      setToast({ type: 'error', msg: 'Failed' });
    }
  };

  const calculatedPrice = selectedListing
    ? (selectedListing.price * (1 - discountPercent / 100)).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border ${
          toast.type === 'success' ? 'bg-green-500/15 border-green-500/20 text-green-400' : 'bg-red-500/15 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Percent className="w-5 h-5 text-white" />
            </div>
            Discounts Manager
          </h1>
          <p className="text-sm text-white/40 mt-1">Apply discounts to products visible on the user dashboard</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Discount
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Tag, textColor: 'text-white' },
            { label: 'Active', value: stats.active, icon: CheckCircle, textColor: 'text-green-400' },
            { label: 'Expired', value: stats.expired, icon: Calendar, textColor: 'text-yellow-400' },
            { label: 'Cancelled', value: stats.cancelled, icon: Ban, textColor: 'text-red-400' },
            { label: 'Total Savings', value: `$${stats.totalSavings.toFixed(2)}`, icon: TrendingDown, textColor: 'text-emerald-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
                <span className="text-[11px] text-white/40 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.textColor}`}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'expired', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
              filter === f
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Discounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-20">
          <Percent className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No discounts found</p>
          <button onClick={openModal} className="mt-4 text-emerald-400 text-sm hover:underline">
            Create your first discount
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {discounts.map((d) => {
            const sc = statusConfig[d.status];
            return (
              <div key={d._id} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/[0.02] flex-shrink-0">
                    {d.listing?.coverImage || (d.listing?.images && d.listing.images.length > 0) ? (
                      <img src={d.listing?.coverImage || d.listing?.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-white/10" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{d.listing?.title || 'Deleted Listing'}</h3>
                      <span className={`${sc.bg} ${sc.color} text-[10px] font-bold px-2 py-0.5 rounded-md capitalize`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {d.listing?.game && (
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" /> {d.listing.game.name}
                        </span>
                      )}
                      {d.reason && (
                        <span className="text-[11px] text-white/30 truncate max-w-[200px]">{d.reason}</span>
                      )}
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs text-white/30 line-through">${d.originalPrice.toFixed(2)}</p>
                        <p className="text-lg font-black text-emerald-400">${d.discountedPrice.toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-black px-3 py-1.5 rounded-lg">
                        -{d.discountPercent}%
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-right flex-shrink-0 hidden md:block">
                    <p className="text-[10px] text-white/20">{d.endDate ? `Ends: ${new Date(d.endDate).toLocaleDateString()}` : 'No expiry'}</p>
                    <p className="text-[10px] text-white/15 mt-0.5">By {d.createdBy?.username || 'Admin'}</p>
                  </div>

                  {/* Action */}
                  {d.status === 'active' && (
                    <button
                      onClick={() => handleCancel(d._id)}
                      className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/30 hover:bg-red-500/15 hover:text-red-400 transition-all flex-shrink-0"
                      title="Cancel discount"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Discount Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-[#131620] border border-white/[0.08] rounded-2xl max-w-lg w-full mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-lg font-bold text-white">Create Discount</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Search Listing */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Select Product *</label>
                {selectedListing ? (
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.02] flex-shrink-0">
                      {selectedListing.coverImage || selectedListing.images?.length > 0 ? (
                        <img src={selectedListing.coverImage || selectedListing.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{selectedListing.title}</p>
                      <p className="text-xs text-emerald-400 font-bold">${selectedListing.price}</p>
                    </div>
                    <button onClick={() => setSelectedListing(null)} className="text-white/30 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search products by name..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-white/20"
                    />

                    {/* Search Results Dropdown */}
                    {(searchResults.length > 0 || searchLoading) && searchQuery && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#131620] border border-white/[0.08] rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                        {searchLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                          </div>
                        ) : (
                          searchResults.map(listing => (
                            <button
                              key={listing._id}
                              onClick={() => { setSelectedListing(listing); setSearchQuery(''); setSearchResults([]); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.03] last:border-0"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.02] flex-shrink-0">
                                {listing.coverImage || listing.images?.length > 0 ? (
                                  <img src={listing.coverImage || listing.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-4 h-4 text-white/10" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate">{listing.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {listing.game && <span className="text-[10px] text-white/30">{listing.game.name}</span>}
                                  <span className="text-[10px] text-emerald-400 font-bold">${listing.price}</span>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Discount Percent Slider */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3 block">
                  Discount Percentage: <span className="text-emerald-400 text-lg font-black ml-2">{discountPercent}%</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={discountPercent}
                  onChange={e => setDiscountPercent(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-white/20 mt-1">
                  <span>1%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>99%</span>
                </div>
              </div>

              {/* Price Preview */}
              {selectedListing && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Original Price</p>
                      <p className="text-lg font-bold text-white/50 line-through">${selectedListing.price.toFixed(2)}</p>
                    </div>
                    <div className="text-3xl font-black text-white/10">→</div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-300/60 uppercase tracking-wider">New Price</p>
                      <p className="text-2xl font-black text-emerald-400">${calculatedPrice}</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-center text-sm font-black py-2 rounded-lg">
                    SAVE ${(selectedListing.price - parseFloat(calculatedPrice)).toFixed(2)} ({discountPercent}% OFF)
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Summer sale, Flash deal..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-white/20"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">End Date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !selectedListing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

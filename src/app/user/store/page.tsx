'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-context';
import { ensureCsrfToken } from '@/utils/csrf';
import { DiscountCampaignsContent } from '@/components/seller/discount-campaigns';
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
  ShoppingCart,
  Edit2,
  Percent,
  Tag,
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
  discount?: {
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    isMandatory?: boolean;
  };
}

interface Stats {
  totalListings: number;
  activeListings: number;
  soldListings: number;
}

// Badge styles per game type
const GAME_BADGES: Record<string, { color: string; labelAr: string; labelEn: string }> = {
  'FIFA': { color: 'bg-green-500', labelAr: 'اي ايه اف سي 25', labelEn: 'EA FC 25' },
  'PUBG': { color: 'bg-orange-500', labelAr: 'عالمي', labelEn: 'GLOBAL' },
  'Arc Raiders': { color: 'bg-pink-500', labelAr: 'اكشن', labelEn: 'ACTION' },
  'Valorant': { color: 'bg-red-500', labelAr: 'رايوت EUW', labelEn: 'RIOT EUW' },
  'League of Legends': { color: 'bg-blue-500', labelAr: 'رايوت EUW', labelEn: 'RIOT EUW' },
};



export default function SellerStorePage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
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

  // Main tab state
  const [storeTab, setStoreTab] = useState<'listings' | 'discounts'>('listings');

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountListing, setDiscountListing] = useState<Listing | null>(null);
  const [discountPercent, setDiscountPercent] = useState(20);
  const [discountDays, setDiscountDays] = useState(7);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountSuccess, setDiscountSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.isSeller)) {
      router.push('/user');
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

  // Helper function to get or refresh CSRF token
  const handleDelete = async (id: string) => {
    setDeleteLoading(id);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/listings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}
      });

      if (res.ok) {
        // Successfully deleted - clear dashboard cache
        sessionStorage.removeItem('dashboard_data');
        sessionStorage.removeItem('dashboard_timestamp');
        fetchListings();
        fetchStats();
      } else if (res.status === 404) {
        // Listing doesn't exist - refresh UI to remove ghost item
        sessionStorage.removeItem('dashboard_data');
        sessionStorage.removeItem('dashboard_timestamp');
        alert(tr('هذا الإعلان لم يعد موجودًا، سيتم تحديث القائمة', 'This listing no longer exists, the list will be refreshed'));
        fetchListings();
        fetchStats();
      } else {
        // Other errors
        const data = await res.json().catch(() => ({}));
        alert(data.message || tr('فشل حذف الإعلان', 'Failed to delete listing'));
      }
    } catch (err) {
      console.error(err);
      alert(tr('حدث خطأ أثناء حذف الإعلان', 'An error occurred while deleting the listing'));
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
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/v1/promotions/request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-XSRF-TOKEN': csrfToken })
        },
        body: JSON.stringify({
          listingId: promoteListing._id,
          days: promoteDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear dashboard cache
        sessionStorage.removeItem('dashboard_data');
        sessionStorage.removeItem('dashboard_timestamp');
        setPromoteSuccess(true);
        setTimeout(() => {
          setShowPromoteModal(false);
          setPromoteSuccess(false);
        }, 2000);
      } else {
        alert(data.message || tr('فشل إرسال طلب الترويج', 'Failed to submit promotion request'));
      }
    } catch (err) {
      console.error(err);
      alert(tr('فشل إرسال طلب الترويج', 'Failed to submit promotion request'));
    } finally {
      setPromoteLoading(false);
    }
  };

  const openDiscountModal = (listing: Listing) => {
    setDiscountListing(listing);
    setDiscountPercent(20);
    setDiscountDays(7);
    setDiscountSuccess(false);
    setShowDiscountModal(true);
  };

  const handleDiscount = async () => {
    if (!discountListing) return;
    setDiscountLoading(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/v1/discounts/my-listing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-XSRF-TOKEN': csrfToken })
        },
        body: JSON.stringify({
          listingId: discountListing._id,
          discountPercent,
          durationDays: discountDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear dashboard cache
        sessionStorage.removeItem('dashboard_data');
        sessionStorage.removeItem('dashboard_timestamp');
        setDiscountSuccess(true);
        setTimeout(() => {
          setShowDiscountModal(false);
          setDiscountSuccess(false);
          fetchListings(); // Refresh listings
        }, 2000);
      } else {
        alert(data.message || tr('فشل إنشاء الخصم', 'Failed to create discount'));
      }
    } catch (err) {
      console.error(err);
      alert(tr('فشل إنشاء الخصم', 'Failed to create discount'));
    } finally {
      setDiscountLoading(false);
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
    { label: tr('إجمالي الإعلانات', 'Total Listings'), value: stats.totalListings, icon: Package, color: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
    { label: tr('النشطة', 'Active'), value: stats.activeListings, icon: Eye, color: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
    { label: tr('المباعة', 'Sold'), value: stats.soldListings, icon: DollarSign, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
  ];

  const getGameName = (listing: Listing) => {
    if (!listing.game) return tr('لعبة غير معروفة', 'Unknown Game');
    return typeof listing.game === 'object' && listing.game ? listing.game.name : listing.game;
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
              {tr('متجري', 'My Store')}
            </h1>
            <p className="text-white/50 mt-1">{tr('إدارة إعلانات حسابات الألعاب الخاصة بك', 'Manage your game account listings')}</p>
          </div>
          {storeTab === 'listings' && (
            <Button
              onClick={() => router.push('/user/store/new')}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-3 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5 mr-2" /> {tr('إعلان جديد', 'New Listing')}
            </Button>
          )}
        </div>

        {/* Main Tabs: Listings / Discounts */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setStoreTab('listings')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${storeTab === 'listings'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
          >
            <Package className="w-4 h-4" />
            {tr('إعلاناتي', 'My Listings')}
          </button>
          <button
            onClick={() => setStoreTab('discounts')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${storeTab === 'discounts'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
          >
            <Tag className="w-4 h-4" />
            {tr('حملات الخصم', 'Discount Campaigns')}
          </button>
        </div>

        {/* ═══════ DISCOUNTS TAB ═══════ */}
        {storeTab === 'discounts' && <DiscountCampaignsContent />}

        {/* ═══════ LISTINGS TAB ═══════ */}
        {storeTab === 'listings' && <>
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
            {[
              { value: 'all', label: tr('الكل', 'All') },
              { value: 'available', label: tr('متاح', 'Available') },
              { value: 'sold', label: tr('مباع', 'Sold') },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.value
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
              >
                {f.label}
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
              <p className="text-white/40 text-lg">{tr('لا توجد إعلانات بعد', 'No listings yet')}</p>
              <p className="text-white/20 text-sm mt-1">{tr('أنشئ أول إعلان لبدء البيع', 'Create your first listing to start selling')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => {
                const gameName = getGameName(listing);
                const coverUrl = getCoverImageUrl(listing);
                const hasDiscount = !!listing.discount;
                const gameBadge = GAME_BADGES[gameName] || {
                  color: 'bg-gray-500',
                  labelAr: gameName || 'لعبة',
                  labelEn: gameName?.toUpperCase?.() || 'GAME',
                };

                return (
                  <div
                    key={listing._id}
                    className="group rounded-2xl overflow-hidden bg-[#1a1d2e]/40 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col"
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1a1d2e] to-[#0d1117]">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
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
                        {hasDiscount && (
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-lg">
                            -{listing.discount!.discountPercent}%
                          </span>
                        )}
                      </div>

                      {/* Game badge - top right */}
                      <div className="absolute top-3 right-3">
                        <span className="text-[11px] text-white/90 font-bold px-2.5 py-1 rounded-md uppercase tracking-wide bg-black/50 backdrop-blur-sm border border-white/20">
                          {language === 'ar' ? gameBadge.labelAr : gameBadge.labelEn}
                        </span>
                      </div>

                      {/* Action buttons - show on hover */}
                      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {listing.status === 'available' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openPromoteModal(listing); }}
                            className="w-9 h-9 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all"
                            title={tr('ترويج', 'Promote')}
                          >
                            <Megaphone className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(listing._id); }}
                          disabled={deleteLoading === listing._id}
                          className="w-9 h-9 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                          title={tr('حذف', 'Delete')}
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
                            {tr('تم البيع', 'SOLD OUT')}
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

                      {/* Created date */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-white/40">
                          {new Date(listing.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white">EGP {hasDiscount ? listing.discount!.discountedPrice : listing.price}</span>
                          {hasDiscount && (
                            <span className="text-sm text-white/30 line-through">EGP {listing.discount!.originalPrice}</span>
                          )}
                        </div>
                      </div>

                      {/* Seller Action Buttons */}
                      <div className={`grid gap-2 ${listing.status === 'sold' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        {/* Edit Button - only for available listings */}
                        {listing.status !== 'sold' && (
                          <button
                            onClick={() => router.push(`/user/store/edit/${listing._id}`)}
                            className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-500/50 transition-all duration-200 group"
                            title={tr('تعديل الإعلان', 'Edit Listing')}
                          >
                            <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-semibold">{tr('تعديل', 'Edit')}</span>
                          </button>
                        )}

                        {/* Discount Button - only for available listings */}
                        {listing.status !== 'sold' && (
                          <button
                            onClick={() => openDiscountModal(listing)}
                            className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 hover:to-green-500/30 hover:border-emerald-500/50 transition-all duration-200 group"
                            title={tr('إضافة خصم', 'Add Discount')}
                          >
                            <Percent className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-semibold">{tr('خصم', 'Discount')}</span>
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(listing._id)}
                          disabled={deleteLoading === listing._id}
                          className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 text-red-400 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-500/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                          title={tr('حذف الإعلان', 'Delete Listing')}
                        >
                          {deleteLoading === listing._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          )}
                          <span className="text-[10px] font-semibold">{tr('حذف', 'Delete')}</span>
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
        </>}
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
                  <h3 className="text-xl font-bold text-white mb-2">{tr('تم إرسال الطلب', 'Request Submitted')}</h3>
                  <p className="text-white/50 text-sm">{tr('تم إرسال طلب الترويج إلى الإدارة للمراجعة', 'Your promotion request has been sent to admin for review')}</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    {tr('ترويج الإعلان', 'Promote Listing')}
                  </h2>
                  <p className="text-white/40 text-sm mb-6">{tr('زِد ظهور إعلانك أمام عدد أكبر من المشترين', 'Boost your listing visibility to more buyers')}</p>

                  {/* Listing Preview */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6">
                    <h3 className="text-white font-semibold text-sm">{promoteListing.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {typeof promoteListing.game === 'object' ? promoteListing.game.name : promoteListing.game}
                      </span>
                      <span>EGP {promoteListing.price}</span>
                    </div>
                  </div>

                  {/* Days Selector */}
                  <div className="mb-6">
                    <label className="text-xs text-white/50 mb-3 block">{tr('مدة الترويج', 'Promotion Duration')}</label>
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
                          {d}{tr('ي', 'd')}
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
                        <span>{tr('1 يوم', '1 day')}</span>
                        <span>{language === 'ar' ? `${promoteDays} يوم` : `${promoteDays} days`}</span>
                        <span>{tr('30 يوم', '30 days')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">{tr('المدة', 'Duration')}</span>
                      <span className="text-white">{language === 'ar' ? `${promoteDays} يوم` : `${promoteDays} days`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">{tr('السعر لكل يوم', 'Price per day')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-semibold">
                          {((PRICE_PER_DAY / promoteListing.price) * 100).toFixed(1)}%
                        </span>
                        <span className="text-white/30">≈</span>
                        <span className="text-white">EGP {PRICE_PER_DAY}</span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                      <span className="text-white font-medium">{tr('الإجمالي', 'Total Cost')}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-cyan-400">EGP {promoteDays * PRICE_PER_DAY}</span>
                        <span className="text-xs text-white/40">
                          {language === 'ar'
                            ? `${((PRICE_PER_DAY / promoteListing.price) * 100 * promoteDays).toFixed(1)}% من سعر الإعلان`
                            : `${((PRICE_PER_DAY / promoteListing.price) * 100 * promoteDays).toFixed(1)}% of listing price`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3 mb-6">
                    <p className="text-xs text-cyan-400/70 leading-relaxed">
                      {tr('سيتم إرسال طلب الترويج إلى الإدارة للموافقة. بعد الموافقة سيظهر إعلانك بشكل مميز ويصل لمشترين أكثر خلال المدة المحددة.', 'Your promotion request will be sent to admin for approval. Once approved, your listing will be featured and reach more buyers for the selected duration.')}
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
                    {tr('إرسال طلب الترويج', 'Submit Promotion Request')} - EGP {promoteDays * PRICE_PER_DAY}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && discountListing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDiscountModal(false)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl">
            <button onClick={() => setShowDiscountModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="p-8">
              {discountSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{tr('تم إنشاء الخصم', 'Discount Created!')}</h3>
                  <p className="text-white/50 text-sm">{tr('الخصم أصبح نشطًا ومرئيًا للمشترين', 'Your discount is now active and visible to buyers')}</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <Percent className="w-5 h-5 text-white" />
                    </div>
                    {tr('إضافة خصم', 'Add Discount')}
                  </h2>
                  <p className="text-white/40 text-sm mb-6">{tr('أضف خصمًا لجذب المزيد من المشترين فورًا', 'Set a discount to attract more buyers instantly')}</p>

                  {/* Listing Preview */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6">
                    <h3 className="text-white font-semibold text-sm">{discountListing.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {typeof discountListing.game === 'object' ? discountListing.game.name : discountListing.game}
                      </span>
                      <span className="font-semibold text-white">{tr('السعر الأصلي', 'Original')}: EGP {discountListing.price}</span>
                    </div>
                  </div>

                  {/* Discount Percentage Selector */}
                  <div className="mb-6">
                    <label className="text-xs text-white/50 mb-3 block">{tr('نسبة الخصم', 'Discount Percentage')}</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[10, 20, 30, 40].map((p) => (
                        <button
                          key={p}
                          onClick={() => setDiscountPercent(p)}
                          className={`py-3 rounded-xl text-sm font-bold transition-all ${discountPercent === p
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>

                    {/* Custom percentage slider */}
                    <div>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-white/30 mt-1">
                        <span>1%</span>
                        <span className="text-emerald-400 font-bold">{discountPercent}%</span>
                        <span>99%</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div className="mb-6">
                    <label className="text-xs text-white/50 mb-3 block">{tr('المدة (اختياري)', 'Duration (optional)')}</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 3, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDiscountDays(d)}
                          className={`py-2 rounded-lg text-xs font-bold transition-all ${discountDays === d
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                          {d}{tr('ي', 'd')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 mb-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">{tr('السعر الأصلي', 'Original Price')}</span>
                      <span className="text-white font-semibold">EGP {discountListing.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">{tr('قيمة الخصم', 'Discount Amount')}</span>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold text-lg">
                          {discountPercent}% = EGP {(discountListing.price * discountPercent / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-3 flex justify-between items-center">
                      <span className="text-white font-medium">{tr('السعر بعد الخصم', 'New Price')}</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">
                          EGP {(discountListing.price * (1 - discountPercent / 100)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 mb-6">
                    <p className="text-xs text-emerald-400/70 leading-relaxed">
                      {tr('سيتم تطبيق الخصم فورًا وسيظهر السعر المخفض للمشترين. يمكنك إلغاؤه أو تعديله في أي وقت.', 'Your discount will be applied immediately and buyers will see the discounted price. You can cancel or modify it anytime.')}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleDiscount}
                    disabled={discountLoading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {discountLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Tag className="w-5 h-5 mr-2" />
                    )}
                    {language === 'ar' ? `تطبيق خصم ${discountPercent}%` : `Apply ${discountPercent}% Discount`}
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

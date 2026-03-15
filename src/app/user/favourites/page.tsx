'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ensureCsrfToken } from '@/utils/csrf';
import Link from 'next/link';
import {
  Heart,
  Loader2,
  Gamepad2,
  ShieldCheck,
  Trash2,
  ChevronDown,
} from 'lucide-react';

interface FavoriteListing {
  _id: string;
  title: string;
  price: number;
  coverImage: string | null;
  images: string[];
  status: string;
  game: { _id: string; name: string; slug: string } | null;
  seller: { _id: string; username: string; avatar?: string } | null;
  createdAt: string;
}

interface FavoriteItem {
  _id: string;
  listing: FavoriteListing;
  createdAt: string;
}

export default function FavouritesPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async (pageNum: number, append = false) => {
    if (!user) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/v1/favorites?page=${pageNum}&limit=20`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setFavorites(prev => [...prev, ...(data.data || [])]);
        } else {
          setFavorites(data.data || []);
        }
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites(1);
  }, [fetchFavorites]);

  const handleRemove = async (listingId: string) => {
    setRemovingId(listingId);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/favorites/${listingId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': csrfToken || '' },
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f.listing._id !== listingId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFavorites(nextPage, true);
  };

  return (
    <UserDashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{tr('المفضلة', 'Favourites')}</h1>
            <p className="text-[11px] text-white/30">
              {favorites.length > 0 ? tr(`${favorites.length} عنصر محفوظ`, `${favorites.length} saved items`) : tr('العناصر المحفوظة ستظهر هنا', 'Saved items will appear here')}
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-pink-400 animate-spin mb-3" />
            <p className="text-xs text-white/20">{tr('جاري تحميل المفضلة...', 'Loading favorites...')}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-white/10" />
            </div>
            <p className="text-sm text-white/30 font-medium">{tr('لا توجد عناصر مفضلة بعد', 'No favorites yet')}</p>
            <p className="text-xs text-white/15 mt-1">{tr('اضغط على أيقونة القلب في أي إعلان لحفظه هنا', 'Tap the heart icon on any listing to save it here')}</p>
            <Link
              href="/user"
              className="mt-4 px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/15 text-pink-400 text-xs font-medium hover:bg-pink-500/20 transition-all"
            >
              {tr('تصفح الإعلانات', 'Browse listings')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {favorites.map((fav) => {
              const listing = fav.listing;
              if (!listing) return null;
              const coverImg = listing.coverImage || (listing.images?.length > 0 ? listing.images[0] : null);
              const isSold = listing.status !== 'available';

              return (
                <div key={fav._id} className="relative group">
                  <Link
                    href={`/listings/${listing._id}`}
                    className={`block bg-[#0c0f18] rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:-translate-y-1 ${isSold ? 'opacity-50' : ''}`}
                  >
                    {/* Image */}
                    <div className="relative aspect-[5/4] overflow-hidden">
                      {coverImg ? (
                        <img src={coverImg} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
                          <Gamepad2 className="w-10 h-10 text-white/[0.06]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />

                      {/* Shield */}
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      </span>

                      {isSold && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white/80 text-xs font-bold bg-red-500/30 px-3 py-1 rounded-lg border border-red-500/20">{tr('مباع', 'Sold')}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-white transition-colors leading-tight">
                        {listing.title}
                      </h3>

                      {listing.seller && (
                        <p className="text-[9px] text-white/40 mt-1">@{listing.seller.username}</p>
                      )}

                      {listing.game && (
                        <span className="text-[9px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium mt-1.5 inline-block">
                          {listing.game.name}
                        </span>
                      )}

                      <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
                        <p className="text-base font-black text-cyan-400">
                          EGP {listing.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.preventDefault(); handleRemove(listing._id); }}
                    disabled={removingId === listing._id}
                    className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                    title={tr('إزالة من المفضلة', 'Remove from favorites')}
                  >
                    {removingId === listing._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {!loading && page < totalPages && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {tr('تحميل المزيد', 'Load more')}
              </>
            )}
          </button>
        )}
      </div>
    </UserDashboardLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Megaphone,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  DollarSign,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface Promotion {
  _id: string;
  listing: {
    _id: string;
    title: string;
    game: string;
    price: number;
    status: string;
  } | null;
  days: number;
  cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'active';
  rejectionReason: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  active: { label: 'Active', icon: Zap, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' },
};

export default function MyPromotionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || !user.isSeller)) {
      router.push('/user/dashboard');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.isSeller) {
      fetchPromotions();
    }
  }, [user, filter, page]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/promotions/my-requests?status=${filter}&page=${page}&limit=10`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.data) {
        setPromotions(data.data);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b14]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <UserDashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-cyan-400" />
            My Promotions
          </h1>
          <p className="text-white/50 mt-1">Track your listing promotion requests</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'from-cyan-500 to-blue-600' },
            { label: 'Active', value: promotions.filter(p => p.status === 'active').length, color: 'from-green-500 to-emerald-600' },
            { label: 'Pending', value: promotions.filter(p => p.status === 'pending').length, color: 'from-yellow-500 to-orange-600' },
            { label: 'Rejected', value: promotions.filter(p => p.status === 'rejected').length, color: 'from-red-500 to-pink-600' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'active', 'rejected', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Promotions List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-14 h-14 mx-auto mb-4 text-white/10" />
            <p className="text-white/40 text-lg">No promotions yet</p>
            <p className="text-white/20 text-sm mt-1">Promote your listings from My Store to boost visibility</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => {
              const config = statusConfig[promo.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const remaining = promo.status === 'active' ? getRemainingDays(promo.endDate) : null;

              return (
                <div
                  key={promo._id}
                  className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left - Listing Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <h3 className="text-white font-semibold truncate">
                          {promo.listing?.title || 'Deleted Listing'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        {promo.listing && (
                          <span>${promo.listing.price}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(promo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Center - Duration & Cost */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-white font-bold">{promo.days}</p>
                        <p className="text-[10px] text-white/30">days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-cyan-400 font-bold flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {promo.cost}
                        </p>
                        <p className="text-[10px] text-white/30">cost</p>
                      </div>
                      {remaining !== null && (
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{remaining}</p>
                          <p className="text-[10px] text-white/30">remaining</p>
                        </div>
                      )}
                    </div>

                    {/* Right - Status */}
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${config.color} ${config.bg} ${config.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  {promo.status === 'rejected' && promo.rejectionReason && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                      <p className="text-xs text-red-400/80">
                        <span className="font-medium">Reason:</span> {promo.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Active promotion dates */}
                  {promo.status === 'active' && promo.startDate && promo.endDate && (
                    <div className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-xs text-green-400/80">
                        Active from {new Date(promo.startDate).toLocaleDateString()} to {new Date(promo.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-white/60">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}

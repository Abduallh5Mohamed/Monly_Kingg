'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  User,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Ban,
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
  seller: {
    _id: string;
    username: string;
    email: string;
  } | null;
  days: number;
  cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'active';
  rejectionReason: string | null;
  reviewedBy: { username: string } | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface Stats {
  totalPromotions: number;
  pendingCount: number;
  activeCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalRevenue: number;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  active: { label: 'Active', icon: Zap, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' },
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPromotions();
    fetchStats();
  }, [filter, page]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/promotions/all?status=${filter}&page=${page}&limit=15`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.data) {
        setPromotions(data.data);
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
      const res = await fetch('/api/v1/promotions/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.data) setStats(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/promotions/${id}/approve`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        fetchPromotions();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/promotions/${id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Request denied' }),
      });
      if (res.ok) {
        setRejectId(null);
        setRejectReason('');
        fetchPromotions();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = [
    { label: 'Total Requests', value: stats?.totalPromotions || 0, icon: Megaphone, color: 'text-cyan-400' },
    { label: 'Pending', value: stats?.pendingCount || 0, icon: Clock, color: 'text-yellow-400' },
    { label: 'Active', value: stats?.activeCount || 0, icon: Zap, color: 'text-green-400' },
    { label: 'Revenue', value: `$${stats?.totalRevenue || 0}`, icon: DollarSign, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Promotions</h1>
        <p className="text-white/40 text-sm">Manage seller promotion requests and ads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-[#131620] border-white/[0.06]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'active', 'approved', 'rejected', 'expired'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && stats?.pendingCount ? (
              <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                {stats.pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Promotions Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">No promotion requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => {
            const config = statusConfig[promo.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div key={promo._id}>
                <Card className="bg-[#131620] border-white/[0.06] hover:border-white/[0.1] transition-all">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left - Seller & Listing */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-xs text-white/40">{promo.seller?.username || 'Unknown'}</span>
                          <span className="text-[10px] text-white/20">{promo.seller?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <h3 className="text-white font-semibold text-sm truncate">
                            {promo.listing?.title || 'Deleted Listing'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/30">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(promo.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {promo.listing && <span>Listing: ${promo.listing.price}</span>}
                        </div>
                      </div>

                      {/* Center - Duration, Cost, Status */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-white font-bold text-sm">{promo.days}</p>
                          <p className="text-[10px] text-white/25">days</p>
                        </div>
                        <div className="text-center">
                          <p className="text-cyan-400 font-bold text-sm">${promo.cost}</p>
                          <p className="text-[10px] text-white/25">cost</p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${config.color} ${config.bg} ${config.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>

                      {/* Right - Actions */}
                      {promo.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(promo._id)}
                            disabled={actionLoading === promo._id}
                            className="h-9 px-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-medium"
                          >
                            {actionLoading === promo._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => setRejectId(promo._id)}
                            disabled={actionLoading === promo._id}
                            className="h-9 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Active promotion info */}
                    {promo.status === 'active' && promo.startDate && promo.endDate && (
                      <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <p className="text-[11px] text-green-400/70">
                          Active: {new Date(promo.startDate).toLocaleDateString()} — {new Date(promo.endDate).toLocaleDateString()}
                          {promo.reviewedBy && <span className="ml-2 text-white/25">by {promo.reviewedBy.username}</span>}
                        </p>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {promo.status === 'rejected' && promo.rejectionReason && (
                      <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-[11px] text-red-400/70">
                          Reason: {promo.rejectionReason}
                          {promo.reviewedBy && <span className="ml-2 text-white/25">by {promo.reviewedBy.username}</span>}
                        </p>
                      </div>
                    )}

                    {/* Reject form inline */}
                    {rejectId === promo._id && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (optional)"
                          className="flex-1 h-9 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-red-400/30"
                        />
                        <Button
                          onClick={() => handleReject(promo._id)}
                          disabled={actionLoading === promo._id}
                          className="h-9 px-4 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs"
                        >
                          {actionLoading === promo._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Confirm Reject'
                          )}
                        </Button>
                        <Button
                          onClick={() => { setRejectId(null); setRejectReason(''); }}
                          className="h-9 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/40 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
            className="p-2 rounded-lg bg-white/[0.03] text-white/40 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-xs text-white/40">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-white/[0.03] text-white/40 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

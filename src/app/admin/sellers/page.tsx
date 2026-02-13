'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  User,
  FileImage,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  X,
  ShoppingBag,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Shield,
  Hash,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Package,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

/* ─── types ─── */
interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
  fullName?: string;
  stats?: { totalVolume: number; level: number; successfulTrades: number; failedTrades: number };
  isSeller?: boolean;
  sellerApprovedAt?: string;
  createdAt?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  wallet?: { balance: number; hold: number };
}

interface RejectionHistory {
  reason: string;
  rejectedAt: string;
  idType: string;
  fullName: string;
}

interface SellerRequest {
  _id: string;
  user: UserProfile;
  idType: string;
  idImage: string;
  faceImageFront: string;
  faceImageLeft: string;
  faceImageRight: string;
  fullName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: { username: string };
  reviewedAt?: string;
  createdAt: string;
  applicationCount?: number;
  rejectionHistory?: RejectionHistory[];
  sellerStats?: {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalRevenue: number;
    chatCount: number;
  };
}

interface ListingItem {
  _id: string;
  title: string;
  price: number;
  status: string;
  game?: { name: string };
  createdAt: string;
}

interface ChatItem {
  _id: string;
  chatNumber: string;
  type: string;
  lastMessage?: { content: string; timestamp: string };
  participants: { _id: string; username: string; avatar?: string }[];
  updatedAt: string;
}

/* ─── component ─── */
export default function AdminSellerRequests() {
  const [activeTab, setActiveTab] = useState<'applications' | 'sellers'>('applications');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Store className="w-8 h-8 text-cyan-400" />
            Seller Management
          </h1>
          <p className="text-muted-foreground mt-1">Review applications & manage active sellers</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {[
          { key: 'applications' as const, label: 'Applications', icon: <Shield className="w-4 h-4" /> },
          { key: 'sellers' as const, label: 'Active Sellers', icon: <UserCheck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.key
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-white/50 hover:text-white/80'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'applications' ? <ApplicationsSection /> : <ActiveSellersSection />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APPLICATIONS SECTION (pending/approved/rejected)
   ═══════════════════════════════════════════════ */
function ApplicationsSection() {
  const router = useRouter();
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<SellerRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => { fetchRequests(); }, [filter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/requests?status=${filter}&page=${page}&limit=10`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login?redirect=/admin/sellers');
        return;
      }
      const data = await res.json();
      if (data.data) {
        setRequests(data.data);
        setTotalPages(data.totalPages || 1);
        setPendingCount(data.pendingCount || 0);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/requests/${requestId}/approve`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) { fetchRequests(); setSelectedRequest(null); }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/requests/${requestId}/reject`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) { fetchRequests(); setSelectedRequest(null); setShowRejectInput(false); setRejectReason(''); }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    approved: 'text-green-400 bg-green-400/10 border-green-400/30',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
  };
  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle2 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  return (
    <>
      {/* Filters + Pending badge */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {pendingCount > 0 && (
          <div className="ml-auto px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">{pendingCount} pending</span>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No seller requests found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Full Name</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Doc Type</th>
                <th className="text-center text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Attempt</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-center text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {req.user?.avatar ? (
                        <img src={req.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{req.user?.username}</p>
                        <p className="text-xs text-muted-foreground">{req.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/80">{req.fullName}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-white/60 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {req.idType === 'national_id' ? 'National ID' : 'Passport'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${(req.applicationCount || 1) > 1
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-white/50 border border-white/10'
                      }`}>
                      <Hash className="w-3 h-3" />
                      {req.applicationCount || 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[req.status]}`}>
                      {statusIcons[req.status]}
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-all border border-white/[0.06] hover:border-white/20"
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* ─── Application Detail Modal ─── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSelectedRequest(null); setShowRejectInput(false); }} />
          <div className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl">
            <button onClick={() => { setSelectedRequest(null); setShowRejectInput(false); }} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="p-8">
              {/* User Profile Section */}
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                {selectedRequest.user?.avatar ? (
                  <img src={selectedRequest.user.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold text-white">{selectedRequest.fullName}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedRequest.status]}`}>
                      {statusIcons[selectedRequest.status]}
                      {selectedRequest.status}
                    </span>
                    {(selectedRequest.applicationCount || 1) > 1 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Attempt #{selectedRequest.applicationCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">@{selectedRequest.user?.username}</p>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={selectedRequest.user?.email} />
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone" value={selectedRequest.user?.phone || 'N/A'} />
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Address" value={selectedRequest.user?.address || 'N/A'} />
                <InfoCard icon={<Calendar className="w-4 h-4" />} label="Joined" value={selectedRequest.user?.createdAt ? new Date(selectedRequest.user.createdAt).toLocaleDateString() : 'N/A'} />
                <InfoCard icon={<Globe className="w-4 h-4" />} label="Status" value={selectedRequest.user?.isOnline ? '🟢 Online' : '⚫ Offline'} />
                <InfoCard icon={<TrendingUp className="w-4 h-4" />} label="Trades" value={`${selectedRequest.user?.stats?.successfulTrades || 0} successful`} />
              </div>

              {selectedRequest.user?.bio && (
                <div className="mb-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-white/40 mb-1">Bio</p>
                  <p className="text-sm text-white/70">{selectedRequest.user.bio}</p>
                </div>
              )}

              {/* ID & Face Images */}
              <div className="space-y-5 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
                    <FileImage className="w-4 h-4" />
                    {selectedRequest.idType === 'national_id' ? 'National ID' : 'Passport'} Document
                  </h4>
                  <img src={selectedRequest.idImage} alt="ID" className="w-full rounded-xl border border-white/[0.06] object-cover max-h-80" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    Face Verification (3 Angles)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Front', src: selectedRequest.faceImageFront },
                      { label: 'Left Side', src: selectedRequest.faceImageLeft },
                      { label: 'Right Side', src: selectedRequest.faceImageRight },
                    ].map((img) => (
                      <div key={img.label}>
                        <p className="text-xs text-white/40 mb-2">{img.label}</p>
                        <img src={img.src} alt={img.label} className="w-full rounded-xl border border-white/[0.06] object-cover aspect-square" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Previous Rejections History */}
              {selectedRequest.rejectionHistory && selectedRequest.rejectionHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Previous Rejections ({selectedRequest.rejectionHistory.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedRequest.rejectionHistory.map((rh, i) => (
                      <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-red-300/60">Attempt #{i + 1}</span>
                          <span className="text-xs text-white/30">{new Date(rh.rejectedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-red-300/80">{rh.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="pt-4 border-t border-white/[0.06]">
                  {showRejectInput ? (
                    <div className="space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason (will be sent to user as notification)..."
                        className="w-full h-24 rounded-xl bg-white/5 border border-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-400/50 resize-none"
                      />
                      <div className="flex gap-3">
                        <Button onClick={() => setShowRejectInput(false)} variant="outline" className="flex-1 rounded-xl border-white/[0.06] text-white/60">Cancel</Button>
                        <Button onClick={() => handleReject(selectedRequest._id)} disabled={actionLoading} className="flex-1 rounded-xl bg-red-500/80 hover:bg-red-500 text-white">
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button onClick={() => setShowRejectInput(true)} variant="outline" className="flex-1 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button onClick={() => handleApprove(selectedRequest._id)} disabled={actionLoading} className="flex-[2] rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/20">
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Approve Seller
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-300/60 mb-1">Current Rejection Reason:</p>
                  <p className="text-sm text-red-300">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   ACTIVE SELLERS SECTION
   ═══════════════════════════════════════════════ */
function ActiveSellersSection() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchSellers(); }, [page]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/active-sellers?page=${page}&limit=10`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login?redirect=/admin/sellers');
        return;
      }
      const data = await res.json();
      if (data.data) {
        setSellers(data.data);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };



  return (
    <>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No active sellers yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sellers.map((s) => (
            <div key={s._id} className="flex items-center gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              {/* Avatar */}
              {s.user?.avatar ? (
                <img src={s.user.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-green-400" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{s.user?.username}</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                  {s.user?.isOnline && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{s.fullName} &middot; {s.user?.email}</p>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6">
                <StatBadge icon={<Package className="w-3.5 h-3.5" />} label="Listings" value={s.sellerStats?.totalListings || 0} />
                <StatBadge icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Sold" value={s.sellerStats?.soldListings || 0} color="green" />
                <StatBadge icon={<DollarSign className="w-3.5 h-3.5" />} label="Revenue" value={`$${s.sellerStats?.totalRevenue || 0}`} color="yellow" />
                <StatBadge icon={<MessageSquare className="w-3.5 h-3.5" />} label="Chats" value={s.sellerStats?.chatCount || 0} color="blue" />
              </div>

              {/* View */}
              <button
                onClick={() => router.push(`/admin/sellers/${s._id}`)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-all border border-white/[0.06] hover:border-white/20"
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" /> Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm text-white/60">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

/* ─── Helper Components ─── */
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2 text-white/40 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm text-white/80 font-medium truncate">{value || 'N/A'}</p>
    </div>
  );
}

function StatBadge({ icon, label, value, color = 'white' }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    white: 'text-white/60',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
  };
  return (
    <div className="text-center">
      <div className={`flex items-center gap-1 text-xs ${colors[color]}`}>
        {icon}
        <span className="font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-white/30">{label}</p>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  User,
  FileImage,
  CreditCard,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  X
} from 'lucide-react';

interface SellerRequest {
  _id: string;
  user: { _id: string; username: string; email: string };
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
}

export default function AdminSellerRequests() {
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

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/requests?status=${filter}&page=${page}&limit=10`, { credentials: 'include' });
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
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchRequests();
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/requests/${requestId}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        fetchRequests();
        setSelectedRequest(null);
        setShowRejectInput(false);
        setRejectReason('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Store className="w-8 h-8 text-cyan-400" />
            Seller Requests
          </h1>
          <p className="text-muted-foreground mt-1">Manage seller verification applications</p>
        </div>
        {pendingCount > 0 && (
          <div className="px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">{pendingCount} pending review</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No seller requests found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Full Name</th>
                <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-6 py-4">Doc Type</th>
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
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
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
                      <Eye className="w-3.5 h-3.5 inline mr-1" /> View
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSelectedRequest(null); setShowRejectInput(false); }} />
          <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl">
            <button onClick={() => { setSelectedRequest(null); setShowRejectInput(false); }} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="p-8">
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedRequest.fullName}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedRequest.user?.username} Â· {selectedRequest.user?.email}</p>
                </div>
                <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedRequest.status]}`}>
                  {statusIcons[selectedRequest.status]}
                  {selectedRequest.status}
                </span>
              </div>

              {/* ID & Face Images */}
              <div className="space-y-6 mb-6">
                {/* ID Document */}
                <div>
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
                    <FileImage className="w-4 h-4" />
                    {selectedRequest.idType === 'national_id' ? 'National ID' : 'Passport'} Document
                  </h4>
                  <div className="w-full">
                    <img src={selectedRequest.idImage} alt="ID" className="w-full rounded-xl border border-white/[0.06] object-cover max-h-80" />
                  </div>
                </div>

                {/* Face Verification Photos */}
                <div>
                  <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    Face Verification (3 Angles)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-white/40 mb-2">Front</p>
                      <img src={selectedRequest.faceImageFront} alt="Face Front" className="w-full rounded-xl border border-white/[0.06] object-cover aspect-square" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-2">Left Side</p>
                      <img src={selectedRequest.faceImageLeft} alt="Face Left" className="w-full rounded-xl border border-white/[0.06] object-cover aspect-square" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-2">Right Side</p>
                      <img src={selectedRequest.faceImageRight} alt="Face Right" className="w-full rounded-xl border border-white/[0.06] object-cover aspect-square" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="pt-4 border-t border-white/[0.06]">
                  {showRejectInput ? (
                    <div className="space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full h-24 rounded-xl bg-white/5 border border-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-400/50 resize-none"
                      />
                      <div className="flex gap-3">
                        <Button onClick={() => setShowRejectInput(false)} variant="outline" className="flex-1 rounded-xl border-white/[0.06] text-white/60">
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleReject(selectedRequest._id)}
                          disabled={actionLoading}
                          className="flex-1 rounded-xl bg-red-500/80 hover:bg-red-500 text-white"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowRejectInput(true)}
                        variant="outline"
                        className="flex-1 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedRequest._id)}
                        disabled={actionLoading}
                        className="flex-[2] rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/20"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Approve Seller
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-300/60 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-300">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

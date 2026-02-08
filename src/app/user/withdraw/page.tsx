'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  CreditCard,
  Building2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

interface Withdrawal {
  _id: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

const methodLabels: Record<string, { label: string; icon: any; color: string }> = {
  vodafone_cash: { label: 'Vodafone Cash', icon: Smartphone, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  instapay: { label: 'InstaPay', icon: CreditCard, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  paypal: { label: 'PayPal', icon: DollarSign, color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' },
  bank_transfer: { label: 'Bank Transfer', icon: Building2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
};

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
};

export default function WithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [accountDetails, setAccountDetails] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [page]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/withdrawals/my-requests?page=${page}&limit=10`, { credentials: 'include' });
      const data = await res.json();
      if (data.data) {
        setWithdrawals(data.data);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || !method || !accountDetails) {
      setError('All fields are required');
      return;
    }
    if (Number(amount) < 10) {
      setError('Minimum withdrawal amount is 10 LE');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/withdrawals/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          accountDetails,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Withdrawal request submitted successfully!');
        setShowForm(false);
        setAmount('');
        setMethod('');
        setAccountDetails('');
        fetchWithdrawals();
      } else {
        setError(data.message || 'Failed to submit request');
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (method) {
      case 'vodafone_cash': return 'Enter Vodafone number (e.g. 010XXXXXXXX)';
      case 'instapay': return 'Enter InstaPay username or phone';
      case 'paypal': return 'Enter PayPal email address';
      case 'bank_transfer': return 'Enter bank name, account number, IBAN';
      default: return 'Enter account details';
    }
  };

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              Withdraw
            </h1>
            <p className="text-white/50 mt-1 text-sm">Request a withdrawal from your balance</p>
          </div>
          <Button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-500/20 px-6"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'New Request'}
          </Button>
        </div>

        {/* Success / Error */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Withdraw Form */}
        {showForm && (
          <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
              New Withdrawal Request
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Amount (LE)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="number"
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Minimum 10 LE"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(methodLabels).map(([key, { label, icon: Icon, color }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 ${
                        method === key
                          ? `${color} scale-[1.02] shadow-lg`
                          : 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Details */}
              {method && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Account Details</label>
                  <input
                    type="text"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold h-12 shadow-lg shadow-emerald-500/20 text-base"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                ) : (
                  <><ArrowDownToLine className="w-4 h-4 mr-2" /> Submit Withdrawal</>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Withdrawals List */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Your Requests</h3>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/5">
              <Wallet className="w-12 h-12 mx-auto text-white/10 mb-3" />
              <p className="text-white/30 text-sm">No withdrawal requests yet</p>
              <p className="text-white/20 text-xs mt-1">Click &quot;New Request&quot; to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => {
                const mConfig = methodLabels[w.method] || { label: w.method, icon: DollarSign, color: '' };
                const sConfig = statusConfig[w.status];
                const MIcon = mConfig.icon;
                const SIcon = sConfig.icon;

                return (
                  <div
                    key={w._id}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-4 sm:p-5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mConfig.color}`}>
                          <MIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">
                            {Number(w.amount).toLocaleString()} LE
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">{mConfig.label} &middot; {w.accountDetails}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${sConfig.color}`}>
                          <SIcon className="w-3 h-3" />
                          {sConfig.label}
                        </span>
                        <span className="text-xs text-white/30">
                          {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {w.status === 'rejected' && w.rejectionReason && (
                      <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-xs text-red-300/70">Reason: {w.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-white/40">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}

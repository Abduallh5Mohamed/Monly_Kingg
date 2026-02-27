'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { ShoppingBag, Package, Clock, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TxStatus = 'waiting_seller' | 'waiting_buyer' | 'completed' | 'disputed' | 'refunded' | 'auto_confirmed';

interface Tx {
  _id: string;
  amount: number;
  status: TxStatus;
  createdAt: string;
  autoConfirmAt?: string;
  listing: { title: string; coverImage: string; price: number; game?: { name: string } };
  buyer:  { username: string; avatar?: string };
  seller: { username: string; avatar?: string };
}

const STATUS_LABEL: Record<TxStatus, { label: string; color: string }> = {
  waiting_seller: { label: 'Awaiting Credentials',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  waiting_buyer:  { label: 'Awaiting Your Confirm', color: 'text-cyan-400    bg-cyan-500/10    border-cyan-500/20'   },
  completed:      { label: 'Completed',              color: 'text-green-400  bg-green-500/10   border-green-500/20'  },
  auto_confirmed: { label: 'Auto-Confirmed',         color: 'text-green-400  bg-green-500/10   border-green-500/20'  },
  disputed:       { label: 'Disputed',               color: 'text-red-400    bg-red-500/10     border-red-500/20'    },
  refunded:       { label: 'Refunded',               color: 'text-purple-400 bg-purple-500/10  border-purple-500/20' },
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState({ asBuyer: 0, asSeller: 0 });

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/transactions/mine?role=${tab}&limit=50`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTxs(data.data);
        setPendingCounts(data.pendingCounts || { asBuyer: 0, asSeller: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchTxs();
  }, [user, tab, fetchTxs]);

  return (
    <div className="min-h-screen bg-[#060811]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/[0.03] blur-[120px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">My Transactions</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('buyer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all border ${
              tab === 'buyer'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Purchases
            {pendingCounts.asBuyer > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-bold">{pendingCounts.asBuyer}</span>
            )}
          </button>
          <button
            onClick={() => setTab('seller')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all border ${
              tab === 'seller'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Sales
            {pendingCounts.asSeller > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">{pendingCounts.asSeller}</span>
            )}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {txs.map(tx => {
              const { label, color } = STATUS_LABEL[tx.status] || { label: tx.status, color: 'text-white/50 bg-white/5 border-white/10' };
              const needsAction =
                (tab === 'buyer'  && tx.status === 'waiting_buyer') ||
                (tab === 'seller' && tx.status === 'waiting_seller');
              return (
                <Link key={tx._id} href={`/user/transactions/${tx._id}`}>
                  <div className={`bg-[#0a0d16]/80 border rounded-2xl p-4 hover:border-cyan-500/30 transition-all cursor-pointer ${
                    needsAction ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-white/[0.06]'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{tx.listing?.title || 'Listing'}</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {tab === 'buyer' ? `Seller: ${tx.seller?.username}` : `Buyer: ${tx.buyer?.username}`} · {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-cyan-400 font-bold">{tx.amount} EGP</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                      </div>
                    </div>
                    {needsAction && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-cyan-400 text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        {tab === 'seller' ? 'Action required: Submit credentials →' : 'Action required: Review credentials →'}
                      </div>
                    )}
                    {tx.status === 'waiting_buyer' && tx.autoConfirmAt && (
                      <p className="mt-2 text-white/40 text-xs">
                        Auto-confirms: {new Date(tx.autoConfirmAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

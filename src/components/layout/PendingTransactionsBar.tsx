'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { ArrowRight, ShoppingBag } from 'lucide-react';

interface PendingCounts {
  buyer: number;
  seller: number;
  total: number;
}

export default function PendingTransactionsBar() {
  const { user } = useAuth();
  const { on } = useSocket();
  const [counts, setCounts] = useState<PendingCounts | null>(null);

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/v1/transactions/pending-count', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setCounts(data.data);
    } catch {
      // silent fail – bar just won't show
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCounts();
  }, [user]);

  // Re-fetch on any transaction update via socket
  useEffect(() => {
    const unsub = on('transaction_updated', () => fetchCounts());
    return unsub;
  }, [on]);

  if (!user || !counts || counts.total === 0) return null;

  return (
    <Link
      href="/user/transactions"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between
                 bg-[#060c1a]/95 backdrop-blur-md border-t border-white/[0.08]
                 px-5 py-3.5 hover:bg-[#090f20] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full
                           bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
            {counts.total}
          </span>
        </div>

        <div>
          <p className="text-white text-sm font-medium leading-tight">
            {counts.total === 1 ? '1 pending transaction' : `${counts.total} pending transactions`}
          </p>
          <div className="flex gap-3 mt-0.5">
            {counts.buyer > 0 && (
              <span className="text-cyan-400 text-xs">
                {counts.buyer} as buyer
              </span>
            )}
            {counts.seller > 0 && (
              <span className="text-purple-400 text-xs">
                {counts.seller} as seller
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/80 transition-colors text-sm">
        View all
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

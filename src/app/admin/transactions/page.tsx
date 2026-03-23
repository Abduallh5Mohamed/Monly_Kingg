'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
    Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
    ArrowRightLeft, Eye, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type TxStatus = 'pending_seller_approval' | 'waiting_seller' | 'waiting_buyer' | 'completed' | 'rejected_by_seller' | 'disputed' | 'refunded' | 'auto_confirmed';

interface Transaction {
    _id: string;
    amount: number;
    originalAmount?: number;
    discountPercent?: number;
    status: TxStatus;
    createdAt: string;
    listing: { _id: string; title: string; price: number };
    buyer: { _id: string; username: string; email: string };
    seller: { _id: string; username: string; email: string };
}

const statusConfig: Record<TxStatus, { icon: any; label: string; color: string; bg: string }> = {
    pending_seller_approval: { icon: Clock, label: 'Pending Seller Approval', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
    waiting_seller: { icon: Clock, label: 'Waiting Seller', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    waiting_buyer: { icon: Clock, label: 'Waiting Buyer', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
    rejected_by_seller: { icon: XCircle, label: 'Rejected by Seller', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
    disputed: { icon: AlertTriangle, label: 'Disputed', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
    refunded: { icon: XCircle, label: 'Refunded', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
    auto_confirmed: { icon: ShieldCheck, label: 'Auto Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
};

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (statusFilter) params.set('status', statusFilter);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());

            const res = await fetch(`/api/v1/transactions/admin/all?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data);
                setTotal(data.pagination.total);
                setTotalPages(Math.ceil(data.pagination.total / limit));
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, searchQuery]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Stats
    const stats = [
        { label: 'Total', value: total, color: 'from-blue-500 to-cyan-500' },
        { label: 'Disputed', value: transactions.filter(t => t.status === 'disputed').length, color: 'from-red-500 to-pink-500' },
        { label: 'Completed', value: transactions.filter(t => t.status === 'completed' || t.status === 'auto_confirmed').length, color: 'from-green-500 to-emerald-500' },
        { label: 'In Progress', value: transactions.filter(t => t.status === 'pending_seller_approval' || t.status === 'waiting_seller' || t.status === 'waiting_buyer').length, color: 'from-yellow-500 to-amber-500' },
    ];

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <ArrowRightLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Transactions</h1>
                    <p className="text-xs text-white/40">Monitor all platform transactions</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-xs text-white/40 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search by Transaction ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-cyan-500/30"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="pl-10 pr-8 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/30 appearance-none cursor-pointer min-w-[180px]"
                    >
                        <option value="" className="bg-[#0f1117]">All Status</option>
                        <option value="pending_seller_approval" className="bg-[#0f1117]">Pending Seller Approval</option>
                        <option value="waiting_seller" className="bg-[#0f1117]">Waiting Seller</option>
                        <option value="waiting_buyer" className="bg-[#0f1117]">Waiting Buyer</option>
                        <option value="completed" className="bg-[#0f1117]">Completed</option>
                        <option value="rejected_by_seller" className="bg-[#0f1117]">Rejected by Seller</option>
                        <option value="disputed" className="bg-[#0f1117]">Disputed</option>
                        <option value="refunded" className="bg-[#0f1117]">Refunded</option>
                        <option value="auto_confirmed" className="bg-[#0f1117]">Auto Confirmed</option>
                    </select>
                </div>
            </div>

            {/* Transactions Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No transactions found</p>
                </div>
            ) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Listing</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Buyer</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Seller</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {transactions.map(tx => {
                                    const config = statusConfig[tx.status];
                                    const Icon = config.icon;
                                    return (
                                        <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Hash className="w-3 h-3 text-white/20" />
                                                    <span className="text-xs font-mono text-cyan-400/80">{tx._id.slice(-8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-white/80 line-clamp-1 max-w-[180px]">{tx.listing?.title || 'Deleted'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-white/70">{tx.buyer?.username || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-white/70">{tx.seller?.username || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <span className="text-sm font-semibold text-white">{tx.amount} EGP</span>
                                                    {tx.discountPercent && (
                                                        <span className="ml-1 text-[10px] text-green-400">-{tx.discountPercent}%</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-white/40">{formatDate(tx.createdAt)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/admin/transactions/${tx._id}`}>
                                                    <Button size="sm" variant="ghost" className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10">
                                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                            <span className="text-xs text-white/40">
                                Page {page} of {totalPages} ({total} total)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="h-8 text-xs text-white/50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="h-8 text-xs text-white/50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

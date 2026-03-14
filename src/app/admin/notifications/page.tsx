'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ensureCsrfToken } from '@/utils/csrf';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Info,
    ArrowDownCircle,
    ArrowUpCircle,
    AlertTriangle,
    UserCheck,
    CheckCheck,
} from 'lucide-react';

/* ───────────────────── Types ───────────────────── */

interface AdminNotification {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    relatedId?: string;
    metadata?: Record<string, unknown>;
}

interface PendingCounts {
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingSellerRequests: number;
    disputedTransactions: number;
    total: number;
}

/* ───────────────────── Constants ───────────────────── */

const ACTIONABLE_TYPES = new Set([
    'new_deposit_request',
    'new_withdrawal_request',
    'new_seller_request',
    'new_dispute',
    'purchase_disputed',
]);

function getNotificationUrl(n: AdminNotification): string | null {
    const id = n.relatedId;
    switch (n.type) {
        case 'new_deposit_request':
            return '/admin/orders?tab=deposits';
        case 'new_withdrawal_request':
            return '/admin/orders?tab=withdrawals';
        case 'new_seller_request':
            return '/admin/sellers';
        case 'new_dispute':
        case 'purchase_disputed':
            return id ? `/admin/transactions/${id}` : '/admin/transactions';
        default:
            return null;
    }
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    new_deposit_request: <ArrowDownCircle className="w-5 h-5 text-emerald-400" />,
    new_withdrawal_request: <ArrowUpCircle className="w-5 h-5 text-orange-400" />,
    new_seller_request: <UserCheck className="w-5 h-5 text-violet-400" />,
    new_dispute: <AlertTriangle className="w-5 h-5 text-red-400" />,
    purchase_disputed: <AlertTriangle className="w-5 h-5 text-red-400" />,
    seller_approved: <CheckCircle2 className="w-5 h-5 text-green-400" />,
    seller_rejected: <XCircle className="w-5 h-5 text-red-400" />,
    system: <Info className="w-5 h-5 text-blue-400" />,
};

const PENDING_CARDS: { key: keyof Omit<PendingCounts, 'total'>; label: string; icon: React.ReactNode; href: string; color: string }[] = [
    { key: 'pendingDeposits', label: 'Pending Deposits', icon: <ArrowDownCircle className="w-6 h-6" />, href: '/admin/orders?tab=deposits', color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400' },
    { key: 'pendingWithdrawals', label: 'Pending Withdrawals', icon: <ArrowUpCircle className="w-6 h-6" />, href: '/admin/orders?tab=withdrawals', color: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400' },
    { key: 'pendingSellerRequests', label: 'Seller Requests', icon: <UserCheck className="w-6 h-6" />, href: '/admin/sellers', color: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400' },
    { key: 'disputedTransactions', label: 'Disputed Transactions', icon: <AlertTriangle className="w-6 h-6" />, href: '/admin/transactions', color: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400' },
];

/* ───────────────────── Page ───────────────────── */

export default function AdminNotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ pendingDeposits: 0, pendingWithdrawals: 0, pendingSellerRequests: 0, disputedTransactions: 0, total: 0 });
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const userId = user?.id || user?.username || null;

    /* ── Fetch pending counts ── */
    const fetchPendingCounts = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch('/api/v1/notifications/pending-counts', { credentials: 'include' });
            if (res.ok) {
                const data: PendingCounts = await res.json();
                setPendingCounts(data);
            }
        } catch { /* silent */ }
    }, [userId]);

    /* ── Fetch notifications ── */
    const fetchNotifications = useCallback(async (p: number = 1) => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/notifications?limit=30&page=${p}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const actionable = (data.data || []).filter((n: AdminNotification) => ACTIONABLE_TYPES.has(n.type));
                setNotifications(actionable);
                setTotalPages(data.totalPages || 1);
                setPage(data.page || 1);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => {
        fetchPendingCounts();
        fetchNotifications(1);
        const iv = setInterval(fetchPendingCounts, 30000);
        return () => clearInterval(iv);
    }, [fetchPendingCounts, fetchNotifications]);

    /* ── Actions ── */
    const markAsRead = async (id: string) => {
        const csrfToken = await ensureCsrfToken();
        await fetch(`/api/v1/notifications/${id}/read`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'X-XSRF-TOKEN': csrfToken ?? '' },
        });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    };

    const markAllRead = async () => {
        const csrfToken = await ensureCsrfToken();
        await fetch('/api/v1/notifications/read-all', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'X-XSRF-TOKEN': csrfToken ?? '' },
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleClick = async (n: AdminNotification) => {
        if (!n.read) await markAsRead(n._id);
        const url = getNotificationUrl(n);
        if (url) router.push(url);
    };

    const totalPending = pendingCounts.total;
    const unreadCount = notifications.filter(n => !n.read).length;

    /* ───────────────────── Render ───────────────────── */
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Notifications</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {totalPending > 0
                            ? `${totalPending} pending request${totalPending !== 1 ? 's' : ''} need your attention`
                            : 'No pending requests right now'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white/60 hover:text-emerald-400 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                    </button>
                )}
            </div>

            {/* ── Pending Counts Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PENDING_CARDS.map(({ key, label, icon, href, color }) => {
                    const count = pendingCounts[key];
                    return (
                        <button
                            key={key}
                            onClick={() => router.push(href)}
                            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${color}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium opacity-70">{label}</p>
                                    <p className="text-3xl font-bold mt-1">{count}</p>
                                </div>
                                <div className="opacity-40">{icon}</div>
                            </div>
                            {count > 0 && (
                                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Notifications List ── */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-white/40" />
                        <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16 text-white/30">
                        <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No pending requests</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {notifications.map((n) => {
                            const url = getNotificationUrl(n);
                            return (
                                <button
                                    key={n._id}
                                    onClick={() => handleClick(n)}
                                    className={`w-full text-left px-5 py-4 hover:bg-white/[0.04] transition-colors ${!n.read ? 'bg-indigo-500/[0.04]' : ''} ${url ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-0.5 flex-shrink-0">
                                            {TYPE_ICONS[n.type] || <Info className="w-5 h-5 text-white/40" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white truncate">{n.title}</p>
                                                {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                                            </div>
                                            <p className="text-xs text-white/50 mt-1 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-white/25 mt-1.5">{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {!n.read && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                                                className="text-[10px] text-white/30 hover:text-emerald-400 transition-colors whitespace-nowrap mt-1"
                                            >
                                                Mark read
                                            </button>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-white/[0.06]">
                        <button
                            disabled={page <= 1}
                            onClick={() => fetchNotifications(page - 1)}
                            className="px-3 py-1.5 text-xs text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-white/30">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => fetchNotifications(page + 1)}
                            className="px-3 py-1.5 text-xs text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

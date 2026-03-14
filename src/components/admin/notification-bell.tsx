'use client';

import {
    Bell,
    CheckCircle2,
    XCircle,
    Info,
    ArrowDownCircle,
    ArrowUpCircle,
    AlertTriangle,
    UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureCsrfToken } from '@/utils/csrf';

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

/** Notification types that represent actionable admin requests */
const ACTIONABLE_TYPES = new Set([
    'new_deposit_request',
    'new_withdrawal_request',
    'new_seller_request',
    'new_dispute',
    'purchase_disputed',
]);

function getAdminNotificationUrl(n: AdminNotification): string | null {
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
    new_deposit_request: <ArrowDownCircle className="w-4 h-4 text-emerald-400" />,
    new_withdrawal_request: <ArrowUpCircle className="w-4 h-4 text-orange-400" />,
    new_seller_request: <UserCheck className="w-4 h-4 text-violet-400" />,
    new_dispute: <AlertTriangle className="w-4 h-4 text-red-400" />,
    purchase_disputed: <AlertTriangle className="w-4 h-4 text-red-400" />,
    seller_approved: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    seller_rejected: <XCircle className="w-4 h-4 text-red-400" />,
    system: <Info className="w-4 h-4 text-blue-400" />,
};

const PENDING_LABELS: { key: keyof Omit<PendingCounts, 'total'>; label: string; icon: React.ReactNode; href: string }[] = [
    { key: 'pendingDeposits', label: 'Pending Deposits', icon: <ArrowDownCircle className="w-4 h-4 text-emerald-400" />, href: '/admin/orders?tab=deposits' },
    { key: 'pendingWithdrawals', label: 'Pending Withdrawals', icon: <ArrowUpCircle className="w-4 h-4 text-orange-400" />, href: '/admin/orders?tab=withdrawals' },
    { key: 'pendingSellerRequests', label: 'Pending Seller Requests', icon: <UserCheck className="w-4 h-4 text-violet-400" />, href: '/admin/sellers' },
    { key: 'disputedTransactions', label: 'Disputed Transactions', icon: <AlertTriangle className="w-4 h-4 text-red-400" />, href: '/admin/transactions' },
];

export function AdminNotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ pendingDeposits: 0, pendingWithdrawals: 0, pendingSellerRequests: 0, disputedTransactions: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const userId = user?.id || user?.username || null;

    // ── Fetch real pending counts from DB ──
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

    // Poll pending counts every 30 seconds
    useEffect(() => {
        if (!userId) return;
        fetchPendingCounts();
        const iv = setInterval(fetchPendingCounts, 30000);
        return () => clearInterval(iv);
    }, [fetchPendingCounts]);

    // ── Fetch actionable notifications for the dropdown ──
    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch('/api/v1/notifications?limit=20', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                // Only keep actionable (approval/rejection-related) notifications
                const actionable = (data.data || []).filter((n: AdminNotification) => ACTIONABLE_TYPES.has(n.type));
                setNotifications(actionable);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleOpen = () => {
        if (!user) return;
        if (!open) {
            fetchNotifications();
            fetchPendingCounts();
        }
        setOpen(!open);
    };

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

    const handleNotificationClick = async (n: AdminNotification) => {
        if (!n.read) await markAsRead(n._id);
        setOpen(false);
        const url = getAdminNotificationUrl(n);
        if (url) router.push(url);
    };

    const totalPending = pendingCounts.total;
    const unreadActionable = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleOpen}
                className="relative w-9 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.06]"
            >
                <Bell className="h-4 w-4 text-white/50" />
                {totalPending > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full ring-2 ring-[#0f1117]">
                        {totalPending > 99 ? '99+' : totalPending}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#0a0e17]/70 backdrop-blur-xl shadow-2xl shadow-black/60 z-[200]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">Pending Requests</h3>
                            {totalPending > 0 && (
                                <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                                    {totalPending} pending
                                </span>
                            )}
                        </div>
                        {unreadActionable > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-white/40 hover:text-emerald-400 transition-colors font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* ── Pending counts summary ── */}
                    {totalPending > 0 && (
                        <div className="px-5 py-3 border-b border-white/[0.06] space-y-2">
                            {PENDING_LABELS.map(({ key, label, icon, href }) => {
                                const count = pendingCounts[key];
                                if (count === 0) return null;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => { setOpen(false); router.push(href); }}
                                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                                    >
                                        {icon}
                                        <span className="text-xs text-white/70 flex-1 text-left">{label}</span>
                                        <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Body – recent actionable notifications */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-10 text-white/30">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No pending requests</p>
                        </div>
                    ) : (
                        <div>
                            {notifications.length > 0 && (
                                <div className="px-5 pt-3 pb-1">
                                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Recent Activity</span>
                                </div>
                            )}
                            {notifications.map((n) => {
                                const url = getAdminNotificationUrl(n);
                                return (
                                    <button
                                        key={n._id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`w-full text-left px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${!n.read ? 'bg-indigo-500/[0.04]' : ''} ${url ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex-shrink-0">
                                                {TYPE_ICONS[n.type] || <Info className="w-4 h-4 text-white/40" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-white truncate">{n.title}</p>
                                                    {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-white/25 mt-1">{timeAgo(n.createdAt)}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

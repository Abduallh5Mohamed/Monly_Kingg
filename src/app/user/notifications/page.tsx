'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useRouter } from 'next/navigation';
import { ensureCsrfToken } from '@/utils/csrf';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Info,
    Crown,
    Loader2,
    CheckCheck,
    ChevronDown,
    MessageCircle,
    CreditCard,
    ArrowRightLeft,
    ShieldCheck,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    relatedId?: string;
    metadata?: { rejectionReason?: string };
}

function getNotificationUrl(n: Notification): string | null {
    const id = n.relatedId;
    switch (n.type) {
        case 'purchase_initiated':
        case 'credentials_sent':
        case 'purchase_confirmed':
        case 'purchase_disputed':
        case 'dispute_resolved':
        case 'auto_confirmed':
            return id ? `/user/transactions/${id}` : '/user/transactions';
        case 'seller_approved':
        case 'seller_rejected':
            return '/user/profile';
        case 'new_message':
            return '/user/chat';
        case 'level_up':
            return '/user/seller-levels';
        case 'deposit_approved':
        case 'deposit_rejected':
        case 'withdrawal_approved':
        case 'withdrawal_rejected':
            return '/user/payments';
        case 'listing_sold':
            return id ? `/user/transactions/${id}` : '/user/transactions';
        default:
            return null;
    }
}

function getNotificationIcon(type: string) {
    switch (type) {
        case 'seller_approved':
        case 'deposit_approved':
        case 'withdrawal_approved':
        case 'purchase_confirmed':
        case 'auto_confirmed':
            return <CheckCircle2 className="w-5 h-5 text-green-400" />;
        case 'seller_rejected':
        case 'deposit_rejected':
        case 'withdrawal_rejected':
            return <XCircle className="w-5 h-5 text-red-400" />;
        case 'purchase_disputed':
            return <AlertTriangle className="w-5 h-5 text-orange-400" />;
        case 'dispute_resolved':
            return <ShieldCheck className="w-5 h-5 text-blue-400" />;
        case 'purchase_initiated':
        case 'listing_sold':
            return <ArrowRightLeft className="w-5 h-5 text-blue-400" />;
        case 'credentials_sent':
            return <Info className="w-5 h-5 text-cyan-400" />;
        case 'level_up':
            return <Crown className="w-5 h-5 text-yellow-400" />;
        case 'new_message':
            return <MessageCircle className="w-5 h-5 text-cyan-400" />;
        case 'system':
            return <Info className="w-5 h-5 text-blue-400" />;
        default:
            return <Bell className="w-5 h-5 text-white/40" />;
    }
}

function getNotificationColor(type: string): string {
    if (type.includes('approved') || type.includes('confirmed') || type === 'auto_confirmed') return 'from-green-500/15 to-emerald-500/10 border-green-500/10';
    if (type.includes('rejected')) return 'from-red-500/15 to-rose-500/10 border-red-500/10';
    if (type.includes('disputed')) return 'from-orange-500/15 to-amber-500/10 border-orange-500/10';
    if (type === 'level_up') return 'from-yellow-500/15 to-amber-500/10 border-yellow-500/10';
    if (type === 'new_message') return 'from-cyan-500/15 to-blue-500/10 border-cyan-500/10';
    return 'from-blue-500/15 to-indigo-500/10 border-blue-500/10';
}

function timeAgo(dateStr: string, language: 'ar' | 'en'): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return language === 'ar' ? 'الآن' : 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return language === 'ar' ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}

type FilterType = 'all' | 'unread' | 'transactions' | 'account' | 'system';

export default function NotificationsPage() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<FilterType>('all');
    const [markingAll, setMarkingAll] = useState(false);

    const transactionTypes = ['purchase_initiated', 'credentials_sent', 'purchase_confirmed', 'purchase_disputed', 'dispute_resolved', 'auto_confirmed', 'listing_sold'];
    const accountTypes = ['seller_approved', 'seller_rejected', 'level_up', 'deposit_approved', 'deposit_rejected', 'withdrawal_approved', 'withdrawal_rejected'];

    const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
        if (!user) return;
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await fetch(`/api/v1/notifications?page=${pageNum}&limit=20`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setNotifications(prev => [...prev, ...(data.data || [])]);
                } else {
                    setNotifications(data.data || []);
                }
                setTotalPages(data.totalPages || 1);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications(1);
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        const csrfToken = await ensureCsrfToken();
        await fetch(`/api/v1/notifications/${id}/read`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'X-XSRF-TOKEN': csrfToken || '' },
        });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            const csrfToken = await ensureCsrfToken();
            await fetch('/api/v1/notifications/read-all', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'X-XSRF-TOKEN': csrfToken || '' },
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all read:', error);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (n: Notification) => {
        if (!n.read) await handleMarkAsRead(n._id);
        const url = getNotificationUrl(n);
        if (url) router.push(url);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(nextPage, true);
    };

    const filteredNotifications = notifications.filter(n => {
        switch (filter) {
            case 'unread': return !n.read;
            case 'transactions': return transactionTypes.includes(n.type);
            case 'account': return accountTypes.includes(n.type);
            case 'system': return n.type === 'system' || n.type === 'new_message';
            default: return true;
        }
    });

    const filters: { id: FilterType; label: string }[] = [
        { id: 'all', label: tr('الكل', 'All') },
        { id: 'unread', label: tr('غير المقروءة', 'Unread') },
        { id: 'transactions', label: tr('المعاملات', 'Transactions') },
        { id: 'account', label: tr('الحساب', 'Account') },
        { id: 'system', label: tr('النظام', 'System') },
    ];

    return (
        <UserDashboardLayout>
            <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Bell className="w-5 h-5 text-white" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full shadow-lg shadow-red-500/40">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">{tr('الإشعارات', 'Notifications')}</h1>
                            <p className="text-[11px] text-white/30">
                                {unreadCount > 0 ? tr(`${unreadCount} غير مقروء`, `${unreadCount} unread`) : tr('تمت القراءة بالكامل', 'All caught up')}
                            </p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/15 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                        >
                            {markingAll ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                            )}
                            {tr('تحديد الكل كمقروء', 'Mark all as read')}
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${filter === f.id
                                ? 'bg-white/10 text-white border border-white/15'
                                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                                }`}
                        >
                            {f.label}
                            {f.id === 'unread' && unreadCount > 0 && (
                                <span className="ml-1.5 text-[10px] text-cyan-400">{unreadCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                        <p className="text-xs text-white/20">{tr('جاري تحميل الإشعارات...', 'Loading notifications...')}</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                            <Bell className="w-7 h-7 text-white/10" />
                        </div>
                        <p className="text-sm text-white/30 font-medium">{tr('لا توجد إشعارات', 'No notifications')}</p>
                        <p className="text-xs text-white/15 mt-1">
                            {filter === 'unread' ? tr('كل شيء مقروء الآن', 'Everything is read now') : tr('عند حدوث أي شيء ستجده هنا', 'Updates will appear here')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredNotifications.map((n) => {
                            const url = getNotificationUrl(n);
                            const colorClass = getNotificationColor(n.type);

                            return (
                                <button
                                    key={n._id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden ${url ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : 'cursor-default'
                                        } ${!n.read
                                            ? `bg-gradient-to-r ${colorClass} shadow-lg shadow-black/10`
                                            : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 p-4">
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${!n.read ? 'bg-white/10' : 'bg-white/[0.04]'
                                            }`}>
                                            {getNotificationIcon(n.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-semibold truncate ${!n.read ? 'text-white' : 'text-white/60'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && (
                                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                                                )}
                                            </div>
                                            <p className={`text-xs mt-0.5 line-clamp-2 ${!n.read ? 'text-white/50' : 'text-white/30'}`}>
                                                {n.message}
                                            </p>
                                            {n.metadata?.rejectionReason && (
                                                <p className="text-[11px] text-red-400/70 mt-1 line-clamp-1">
                                                    {tr('السبب', 'Reason')}: {n.metadata.rejectionReason}
                                                </p>
                                            )}
                                            <p className={`text-[10px] mt-1.5 ${!n.read ? 'text-white/25' : 'text-white/15'}`}>
                                                {timeAgo(n.createdAt, language)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Load More */}
                        {page < totalPages && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        {tr('تحميل المزيد', 'Load more')}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </UserDashboardLayout>
    );
}

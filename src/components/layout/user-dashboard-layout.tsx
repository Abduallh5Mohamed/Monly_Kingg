'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Store, X, CheckCircle2, XCircle, Info, Crown, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BecomeSellerModal } from '@/components/become-seller-modal';
import Link from 'next/link';

interface UserDashboardLayoutProps {
  children: React.ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [sellerModalOpen, setSellerModalOpen] = useState(false);

  // Check if profile is completed
  useEffect(() => {
    if (pathname === '/complete-profile') return;
    if (!user) return;
    if (user.profileCompleted !== true) {
      console.log('➡️ Dashboard redirecting to /complete-profile');
      router.push('/complete-profile');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Bottom Navigation Bar */}
      <UserSidebar />

      {/* Main Content */}
      <div className="min-h-screen">
        {/* ═══════ MODERN TOP HEADER ═══════ */}
        <header className="sticky top-0 z-40 bg-[#0d1017]/80 backdrop-blur-2xl border-b border-white/[0.04]">
          {/* Subtle gradient line at very top */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              
              {/* Search Bar - Glassmorphism */}
              <div className="flex-1 max-w-xl">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search accounts, games, gift cards..."
                    className="w-full pl-11 pr-4 bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-white/25 rounded-2xl h-11 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20 hover:bg-white/[0.06] transition-all duration-300"
                  />
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                
                {/* Become Seller / My Store - Always visible */}
                {user?.isSeller ? (
                  <Link
                    href="/user/store"
                    className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 to-green-500/15 border border-emerald-500/20 rounded-xl" />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 to-green-500/25 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Store className="h-4 w-4 text-emerald-400 relative z-10" />
                    <span className="hidden sm:inline text-xs font-bold text-emerald-300 relative z-10 tracking-wide">My Store</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setSellerModalOpen(true)}
                    className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/15 rounded-xl" />
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Store className="h-4 w-4 text-cyan-400 relative z-10" />
                    <span className="hidden sm:inline text-xs font-bold text-cyan-300 relative z-10 tracking-wide">Become Seller</span>
                  </button>
                )}

                {/* Level Badge - Premium glass style */}
                <Link
                  href="/user/profile"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-br from-purple-500/15 to-violet-600/15 border border-purple-400/20 rounded-xl px-3 py-2 hover:border-purple-400/40 hover:scale-105 transition-all duration-300 group"
                  title="Level"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <span className="text-white text-[10px] font-black">1</span>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[9px] text-purple-300/60 leading-none uppercase tracking-wider">Level</p>
                    <p className="text-xs font-black text-purple-200 leading-none">VIP</p>
                  </div>
                </Link>

                {/* Balance Badge - Premium glass style */}
                <Link
                  href="/user/payments"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-br from-emerald-500/15 to-green-600/15 border border-emerald-400/20 rounded-xl px-3 py-2 hover:border-emerald-400/40 hover:scale-105 transition-all duration-300 group"
                  title="Balance"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="text-white text-[10px] font-black">$</span>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[9px] text-emerald-300/60 leading-none uppercase tracking-wider">Balance</p>
                    <p className="text-xs font-black text-emerald-200 leading-none">600</p>
                  </div>
                </Link>

                {/* Notifications */}
                <NotificationBell />

                {/* User Avatar - Modern ring */}
                <Link
                  href="/user/profile"
                  className="relative group"
                  title="Profile"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition-all duration-300 group-hover:scale-110">
                    <div className="w-full h-full rounded-full bg-[#0d1017] flex items-center justify-center">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0d1017]" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-28">
          {children}
        </main>
      </div>

      {/* Become Seller Modal */}
      <BecomeSellerModal isOpen={sellerModalOpen} onClose={() => setSellerModalOpen(false)} />
    </div>
  );
}

/* ─── Notification Bell Component ─── */
interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: { rejectionReason?: string };
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Poll unread count every 30s
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications/unread-count', { credentials: 'include' });
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [fetchUnread]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/notifications?limit=15', { credentials: 'include' });
      const data = await res.json();
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/v1/notifications/read-all', { method: 'PUT', credentials: 'include' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    seller_approved: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    seller_rejected: <XCircle className="w-4 h-4 text-red-400" />,
    system: <Info className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 text-white/40 hover:text-white transition-all duration-300"
      >
        <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse shadow-lg shadow-red-500/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-white/30">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => { if (!n.read) markAsRead(n._id); }}
                  className={`w-full text-left px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${!n.read ? 'bg-cyan-500/[0.03]' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {typeIcons[n.type] || <Info className="w-4 h-4 text-white/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-white/25 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

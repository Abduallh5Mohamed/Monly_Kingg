'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Store, X, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const [balance, setBalance] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);

  // Fetch user balance and level from database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/v1/users/profile', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.user) {
            setBalance(data.data.user.wallet?.balance || 0);
            setLevel(data.data.user.stats?.level || 1);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    if (user) {
      fetchUserData();

      const interval = setInterval(fetchUserData, 10000);

      const handleDataUpdate = () => {
        fetchUserData();
      };
      window.addEventListener('userDataUpdated', handleDataUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('userDataUpdated', handleDataUpdate);
      };
    }
  }, [user]);

  // Check if profile is completed
  useEffect(() => {
    // Don't redirect if already on complete-profile page
    if (pathname === '/complete-profile') return;

    // Only check once on mount, not on every navigation
    if (!user) return;

    // Redirect to complete-profile if profile is not completed
    // Check for false, undefined, or null
    if (user.profileCompleted !== true) {
      console.log('➡️ Dashboard redirecting to /complete-profile');
      router.push('/complete-profile');
    }
  }, [user]); // Only depend on user, not pathname

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <UserSidebar />
      </div>

      {/* Main Content */}
      <div className="md:ml-20 min-h-screen">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-[#131720] to-[#1a1d2e] border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
                <Input
                  placeholder="Search..."
                  className="pl-10 sm:pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full h-10 sm:h-12 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Become Seller / My Store */}
              {user && !user.isSeller && (
                <button
                  onClick={() => setSellerModalOpen(true)}
                  className="relative group flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.03]"
                  title="Become a Seller"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Store className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors relative z-10" />
                  <span className="hidden sm:inline text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 transition-colors relative z-10">Become Seller</span>
                </button>
              )}
              {user?.isSeller && (
                <Link
                  href="/user/store"
                  className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.03]"
                  title="My Store"
                >
                  <Store className="h-4 w-4 text-green-400" />
                  <span className="hidden sm:inline text-xs font-semibold text-green-300">My Store</span>
                </Link>
              )}

              {/* Level Badge - hidden on very small screens */}
              <div className="relative group hidden sm:block">
                <Link
                  href="/user/profile"
                  className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl px-2.5 py-1.5 border border-purple-400/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 transition-all cursor-pointer block"
                  title="Go to Profile"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-400/50">
                      <span className="text-purple-200 text-[10px] sm:text-xs font-bold">{level}</span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] text-purple-200/80 leading-none">Level</p>
                      <p className="text-sm font-bold text-white leading-none">VIP</p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Balance Badge */}
              <div className="relative group hidden sm:block">
                <Link
                  href="/user/payments"
                  className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl px-2.5 py-1.5 border border-emerald-400/30 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all cursor-pointer block"
                  title="Go to Payments"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-400/50">
                      <span className="text-emerald-200 text-[10px] sm:text-xs font-bold">$</span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] text-emerald-200/80 leading-none">Balance</p>
                      <p className="text-sm font-bold text-white leading-none">{balance.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User Avatar */}
              <Link
                href="/user/profile"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-cyan-500 hover:border-cyan-400 hover:scale-110 transition-all cursor-pointer flex-shrink-0 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
                title="Go to Profile"
              >
                <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f1419] border-t border-white/10 px-4 py-2 safe-area-bottom">
          <div className="flex items-center justify-around">
            {[
              { icon: '🏠', label: 'Home', path: '/user/dashboard' },
              { icon: '💬', label: 'Chat', path: '/user/chat' },
              { icon: '💳', label: 'Pay', path: '/user/payments' },
              { icon: '👤', label: 'Profile', path: '/user/profile' },
            ].map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-white/50 hover:text-white transition-all"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
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
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="rounded-full hover:bg-white/10 text-white/60 hover:text-white relative h-9 w-9 sm:h-10 sm:w-10"
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

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

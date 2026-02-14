'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Store, X, CheckCircle2, XCircle, Info, Crown, Sparkles, Wallet, TrendingUp } from 'lucide-react';
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
  const [balance, setBalance] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for header effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    if (pathname === '/complete-profile') return;
    if (!user) return;
    if (user.profileCompleted !== true) {
      console.log('➡️ Dashboard redirecting to /complete-profile');
      router.push('/complete-profile');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#060811]">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/[0.03] blur-[120px]" />
        <div className="absolute -top-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-cyan-600/[0.03] blur-[120px]" />
        <div className="absolute top-[60%] left-[30%] w-[40%] h-[40%] rounded-full bg-blue-600/[0.02] blur-[100px]" />
      </div>

      {/* Bottom Navigation Bar */}
      <UserSidebar />

      {/* Main Content */}
      <div className="relative min-h-screen">
        {/* ═══════ ULTRA MODERN HEADER ═══════ */}
        <header className={`sticky top-0 z-40 transition-all duration-500 ${
          scrolled 
            ? 'bg-[#060811]/90 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]' 
            : 'bg-transparent'
        }`}>
          {/* Animated gradient line */}
          <div className="h-[1px] w-full overflow-hidden">
            <div className="h-full w-[200%] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" 
                 style={{ animation: 'shimmer 3s ease-in-out infinite' }} />
          </div>
          
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-3">
              
              {/* Logo / Brand mark */}
              <Link href="/user" className="flex-shrink-0 flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-110">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:block text-lg font-black text-white tracking-tight">
                  Monly<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">King</span>
                </span>
              </Link>

              {/* Search Bar - Modern floating */}
              <div className={`flex-1 max-w-lg transition-all duration-500 ${searchFocused ? 'max-w-2xl' : ''}`}>
                <div className="relative group">
                  <div className={`absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-300 ${searchFocused ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20" />
                  </div>
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300 ${searchFocused ? 'text-cyan-400 scale-110' : 'text-white/25'}`} />
                  <input
                    type="text"
                    placeholder="Search games, accounts, gift cards..."
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="relative w-full pl-11 pr-4 bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-white/20 rounded-2xl h-11 text-sm focus:outline-none focus:bg-white/[0.07] hover:bg-white/[0.06] transition-all duration-300"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-[10px] text-white/20 bg-white/[0.05] rounded-md border border-white/[0.08] font-mono">⌘K</kbd>
                  </div>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                
                {/* Become Seller / My Store */}
                {user?.isSeller ? (
                  <Link
                    href="/user/store"
                    className="group relative flex items-center gap-2 px-3.5 py-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/15 rounded-xl group-hover:from-emerald-500/20 group-hover:to-green-500/20 transition-all" />
                    <Store className="h-4 w-4 text-emerald-400 relative z-10" />
                    <span className="hidden md:inline text-xs font-semibold text-emerald-300 relative z-10">My Store</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setSellerModalOpen(true)}
                    className="group relative flex items-center gap-2 px-3.5 py-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/15 rounded-xl group-hover:from-violet-500/20 group-hover:to-purple-500/20 transition-all" />
                    <Store className="h-4 w-4 text-violet-400 relative z-10" />
                    <span className="hidden md:inline text-xs font-semibold text-violet-300 relative z-10">Sell Now</span>
                  </button>
                )}

                {/* Balance Chip */}
                <Link
                  href="/user/payments"
                  className="hidden sm:flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-emerald-500/20 rounded-xl px-3 py-2 transition-all duration-300 group"
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/80 group-hover:text-emerald-300 transition-colors tabular-nums">
                    ${balance.toFixed(2)}
                  </span>
                </Link>

                {/* Level Chip */}
                <Link
                  href="/user/profile"
                  className="hidden sm:flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-purple-500/20 rounded-xl px-3 py-2 transition-all duration-300 group"
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/80 group-hover:text-purple-300 transition-colors">Lv.{level}</span>
                </Link>

                {/* Notifications */}
                <NotificationBell />

                {/* User Avatar - Minimal elegant */}
                <Link
                  href="/user/profile"
                  className="relative group flex-shrink-0"
                  title="Profile"
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-white/[0.08] group-hover:ring-cyan-500/30 transition-all duration-300 group-hover:scale-105">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                      </div>
                    )}
                  </div>
                  {/* Online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-[2px] border-[#060811] shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative p-4 sm:p-6 lg:p-8 pb-28">
          {children}
        </main>
      </div>

      {/* Become Seller Modal */}
      <BecomeSellerModal isOpen={sellerModalOpen} onClose={() => setSellerModalOpen(false)} />

      {/* Keyframes for shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-25%); }
          50% { transform: translateX(0%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/10 text-white/30 hover:text-white transition-all duration-300"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full shadow-lg shadow-red-500/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0a0e17]/98 backdrop-blur-2xl shadow-2xl shadow-black/50 z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-white/40 hover:text-cyan-400 transition-colors font-medium">
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

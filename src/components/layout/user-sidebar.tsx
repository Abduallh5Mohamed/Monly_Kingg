'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Store, MessageCircle, CreditCard, User, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-context';
import { useEffect, useRef, useState } from 'react';

interface NavItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    path: string;
    dot?: boolean;        // show red dot (no number)
    activeColor: string;
    glowColor: string;
}

export function UserSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { on } = useSocket();
    const [mounted, setMounted] = useState(false);
    const [chatUnread, setChatUnread] = useState(false);

    // Keep a ref so the socket callback always sees the latest pathname
    const pathnameRef = useRef(pathname);
    useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

    const isOnChatPage = !!(pathname?.startsWith('/user/chat'));

    useEffect(() => {
        setMounted(true);
    }, []);

    // ── Fetch initial unread count ─────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const res = await fetch('/api/v1/chats', { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json();
                const total: number = (data.data?.chats ?? []).reduce(
                    (sum: number, c: any) => sum + (c.unreadCount || 0), 0
                );
                setChatUnread(total > 0);
            } catch { /* silent */ }
        })();
    }, [user]);

    // ── Clear dot immediately when user enters any chat page ──────────────
    useEffect(() => {
        if (isOnChatPage) setChatUnread(false);
    }, [isOnChatPage]);

    // ── Listen for new socket messages ────────────────────────────────────
    useEffect(() => {
        return on('new_message', () => {
            // Only light up if user is NOT on the chat page
            if (!pathnameRef.current?.startsWith('/user/chat')) {
                setChatUnread(true);
            }
        });
    }, [on]);

    const leftItems: NavItem[] = [
        {
            icon: MessageCircle, label: 'Chat', path: '/user/chat',
            dot: chatUnread && !isOnChatPage,
            activeColor: 'from-pink-500 to-rose-500', glowColor: 'rgba(236,72,153,0.35)'
        },
        { icon: Store, label: 'Store', path: '/user/browse', activeColor: 'from-amber-500 to-orange-500', glowColor: 'rgba(245,158,11,0.35)' },
    ];

    const rightItems: NavItem[] = [
        { icon: ArrowRightLeft, label: 'Orders', path: '/user/transactions', activeColor: 'from-cyan-500 to-blue-500', glowColor: 'rgba(6,182,212,0.35)' },
        { icon: CreditCard, label: 'Pay', path: '/user/payments', activeColor: 'from-emerald-500 to-green-500', glowColor: 'rgba(16,185,129,0.35)' },
        { icon: User, label: 'Profile', path: '/user/profile', activeColor: 'from-violet-500 to-purple-500', glowColor: 'rgba(139,92,246,0.35)' },
    ];

    const homeItem = { icon: Home, label: 'Home', path: '/user' };

    const isPathActive = (path: string, isHome: boolean) => {
        if (isHome) return pathname === '/user' || pathname === '/user/';
        return pathname === path || pathname?.startsWith(path + '/');
    };

    const renderNavItem = (item: NavItem) => {
        const isActive = isPathActive(item.path, false);
        const Icon = item.icon;

        return (
            <Link
                key={item.path}
                href={item.path}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3.5 transition-all duration-300 group"
            >
                {/* Active dot indicator */}
                {isActive && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))`, boxShadow: `0 0 8px ${item.glowColor}` }}>
                        <div className={`w-full h-full rounded-full bg-gradient-to-br ${item.activeColor}`} />
                    </div>
                )}

                <div className="relative">
                    <Icon className={`w-[20px] h-[20px] transition-all duration-300 ${isActive
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                        : 'text-white/30 group-hover:text-white/55'
                        }`} />

                    {item.dot && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.7)] ring-2 ring-[#0f1322]" />
                    )}
                </div>

                <span className={`text-[9px] font-medium transition-all duration-300 ${isActive ? 'text-white/80' : 'text-white/25 group-hover:text-white/40'
                    }`}>
                    {item.label}
                </span>
            </Link>
        );
    };

    const isHomeActive = isPathActive(homeItem.path, true);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-3 px-5">
            <div className={`relative w-full max-w-[400px] pointer-events-auto transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                {/* ── Floating Home Button (completely outside the bar) ── */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-20">
                    <Link href={homeItem.path} className="relative flex flex-col items-center group">
                        {/* Orbital ring - always spinning */}
                        <div className="absolute w-[72px] h-[72px] rounded-full"
                            style={{
                                background: 'conic-gradient(from 0deg, rgba(34,211,238,0.5), transparent 40%, rgba(99,102,241,0.5) 60%, transparent)',
                                animation: 'orbit 3s linear infinite',
                                top: '-4px',
                                left: '-4px',
                            }}
                        />
                        <div className="absolute w-[72px] h-[72px] rounded-full bg-[#0a0e1a]"
                            style={{ top: '-2px', left: '-2px', width: '68px', height: '68px', margin: '2px' }}
                        />

                        {/* Soft glow behind */}
                        <div className={`absolute w-16 h-16 rounded-full transition-all duration-500 ${isHomeActive
                            ? 'bg-blue-500/40 blur-2xl scale-150'
                            : 'bg-blue-500/20 blur-xl scale-125 group-hover:bg-blue-500/35 group-hover:scale-150'
                            }`} />

                        {/* Main circle button */}
                        <div className={`
                            relative w-[64px] h-[64px] rounded-full flex items-center justify-center
                            transition-all duration-300
                            group-hover:scale-110 group-hover:-translate-y-1
                            active:scale-95
                            ${isHomeActive
                                ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_6px_30px_rgba(59,130,246,0.6)]'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_4px_20px_rgba(59,130,246,0.35)]'
                            }
                        `}>
                            {/* Glass sheen */}
                            <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/25 via-transparent to-transparent pointer-events-none" />

                            <Home className={`w-6 h-6 text-white relative z-10 transition-all duration-300 ${isHomeActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                        </div>

                        {/* Home label below button */}
                        <span className={`mt-1 text-[9px] font-bold transition-all duration-300 ${isHomeActive ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'
                            }`}>
                            Home
                        </span>
                    </Link>
                </div>

                {/* ── Main Bar ── */}
                <div className="relative bg-[#0f1322]/95 backdrop-blur-2xl rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-white/[0.06]">

                    {/* Nav Items */}
                    <div className="relative flex items-center justify-between px-2 py-1.5">
                        {/* Left Items */}
                        <div className="flex items-center">
                            {leftItems.map((item) => renderNavItem(item))}
                        </div>

                        {/* Center spacer for the floating home button */}
                        <div className="w-[72px] flex-shrink-0" />

                        {/* Right Items */}
                        <div className="flex items-center">
                            {rightItems.map((item) => renderNavItem(item))}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            ` }} />
        </div>
    );
}

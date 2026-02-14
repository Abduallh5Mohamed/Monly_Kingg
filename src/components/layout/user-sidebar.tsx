'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, MessageSquare, Store, Wallet, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    path: string;
    badge?: number;
}

export function UserSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems: NavItem[] = [
        { icon: MessageSquare, label: 'Chat', path: '/user/chat', badge: 3 },
        { icon: Store, label: 'Store', path: '/user/store' },
        { icon: Home, label: 'Home', path: '/user' },
        { icon: Wallet, label: 'Pay', path: '/user/payments' },
        { icon: User, label: 'Profile', path: '/user/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4 px-4">
            <div className="relative w-full max-w-[420px] pointer-events-auto">

                {/* Glass Background */}
                <div className="relative bg-[#0d1017]/85 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
                    {/* Gradient top line */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent rounded-full" />

                    {/* Nav Items */}
                    <div className="flex items-center justify-around px-2 py-2">
                        {navItems.map((item) => {
                            const isHome = item.label === 'Home';
                            const isActive = isHome
                                ? pathname === '/user' || pathname === '/user/'
                                : pathname === item.path || pathname?.startsWith(item.path + '/');
                            const Icon = item.icon;

                            if (isHome) {
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className="relative flex items-center justify-center -mt-7"
                                    >
                                        {/* Outer glow ring */}
                                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                                            isActive ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-xl scale-150' : ''
                                        }`} />

                                        {/* Main button */}
                                        <div className={`
                                            relative w-[58px] h-[58px] rounded-full flex items-center justify-center
                                            transition-all duration-300
                                            ${isActive
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 scale-105'
                                                : 'bg-[#161a24] border border-white/[0.08] hover:border-cyan-500/20 shadow-lg shadow-black/40'
                                            }
                                        `}>
                                            <Home className={`w-6 h-6 transition-all duration-300 ${
                                                isActive ? 'text-white drop-shadow-lg' : 'text-white/40'
                                            }`} />

                                            {/* Sparkle decorations when active */}
                                            {isActive && (
                                                <>
                                                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-cyan-300 animate-pulse" />
                                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-ping" />
                                                </>
                                            )}
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className="group relative flex flex-col items-center justify-center py-2 px-1 min-w-[52px]"
                                >
                                    {/* Active background glow */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-xl" />
                                    )}

                                    <div className="relative">
                                        <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${
                                            isActive
                                                ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                                                : 'text-white/30 group-hover:text-white/60'
                                        }`} />

                                        {/* Badge */}
                                        {item.badge && item.badge > 0 && (
                                            <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[8px] font-bold text-white ring-2 ring-[#0d1017] shadow-lg shadow-red-500/30">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                                        isActive ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'
                                    }`}>
                                        {item.label}
                                    </span>

                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

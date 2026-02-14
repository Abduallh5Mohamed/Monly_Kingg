'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, MessageSquare, Store, Wallet, User } from 'lucide-react';
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
        { icon: Store, label: 'Store', path: '/user/browse' },
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
                                        {/* Glow effect */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 blur-lg opacity-60 animate-pulse" />

                                        {/* Main button */}
                                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-2xl border-[3px] border-[#0d1017]">
                                            <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className="relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 hover:bg-white/5"
                                >
                                    <div className="relative">
                                        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`} />
                                        {item.badge && item.badge > 0 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center border border-[#0d1017]">
                                                <span className="text-[9px] font-bold text-white">{item.badge}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-cyan-400' : 'text-white/30'}`}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
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

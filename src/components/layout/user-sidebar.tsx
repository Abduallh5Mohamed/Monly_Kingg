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
        { icon: Store, label: 'Store', path: '/user/store' },
        { icon: Home, label: 'Home', path: '/user' },
        { icon: Wallet, label: 'Pay', path: '/user/payments' },
        { icon: User, label: 'Profile', path: '/user/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-3 px-3 sm:pb-4 sm:px-4">
            <div className="relative w-full max-w-[400px] pointer-events-auto">

                {/* Glass container */}
                <div className="relative bg-[#0a0d16]/90 backdrop-blur-3xl border border-white/[0.05] rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
                    {/* Top accent line */}
                    <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                    {/* Nav Items */}
                    <div className="flex items-center justify-around px-1 py-1.5">
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
                                        className="relative flex items-center justify-center -mt-6"
                                    >
                                        {/* Main button */}
                                        <div className={`
                                            relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center
                                            transition-all duration-400 ease-out
                                            ${isActive
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 scale-100'
                                                : 'bg-[#12151f] border border-white/[0.06] hover:border-cyan-500/15 shadow-lg shadow-black/30 hover:bg-[#161925]'
                                            }
                                        `}>
                                            <Home className={`w-5 h-5 transition-all duration-300 ${
                                                isActive ? 'text-white' : 'text-white/30'
                                            }`} />
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className="group relative flex flex-col items-center justify-center py-2 px-1 min-w-[50px]"
                                >
                                    {/* Active pill background */}
                                    {isActive && (
                                        <div className="absolute inset-x-2 inset-y-1 bg-white/[0.05] rounded-xl" />
                                    )}

                                    <div className="relative">
                                        <Icon className={`w-5 h-5 transition-all duration-300 ${
                                            isActive
                                                ? 'text-white'
                                                : 'text-white/25 group-hover:text-white/50'
                                        }`} />

                                        {/* Badge */}
                                        {item.badge && item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white ring-2 ring-[#0a0d16]">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={`text-[9px] font-medium mt-1 transition-all duration-300 ${
                                        isActive ? 'text-white/70' : 'text-white/15 group-hover:text-white/30'
                                    }`}>
                                        {item.label}
                                    </span>

                                    {/* Active dot indicator */}
                                    {isActive && (
                                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
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

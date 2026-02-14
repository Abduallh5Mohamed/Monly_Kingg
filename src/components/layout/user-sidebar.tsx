'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Store, MessageCircle, CreditCard, User } from 'lucide-react';
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

    // Left items (before Home)
    const leftItems: NavItem[] = [
        { icon: MessageCircle, label: 'Chat', path: '/user/chat', badge: 2 },
        { icon: Store, label: 'Store', path: '/user/browse' },
    ];

    // Right items (after Home)  
    const rightItems: NavItem[] = [
        { icon: CreditCard, label: 'Pay', path: '/user/payments' },
        { icon: User, label: 'Profile', path: '/user/profile' },
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
                className="flex flex-col items-center justify-center gap-1 py-2 px-4 transition-all duration-200 relative"
            >
                <div className="relative">
                    <Icon className={`w-5 h-5 transition-colors duration-200 ${
                        isActive
                            ? 'text-white'
                            : 'text-white/40'
                    }`} />
                    {item.badge && item.badge > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{item.badge}</span>
                        </div>
                    )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                    isActive
                        ? 'text-white'
                        : 'text-white/40'
                }`}>
                    {item.label}
                </span>
            </Link>
        );
    };

    const isHomeActive = isPathActive(homeItem.path, true);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4 px-4">
            <div className="relative w-full max-w-[420px] pointer-events-auto">

                {/* Main Bar - Clean Design */}
                <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-[28px] shadow-[0_-2px_20px_rgba(0,0,0,0.4)] border border-white/[0.08]">
                    
                    {/* Nav Items Container */}
                    <div className="relative flex items-center justify-center px-2 py-1">
                        
                        {/* Left Items */}
                        <div className="flex items-center gap-1">
                            {leftItems.map((item) => renderNavItem(item))}
                        </div>

                        {/* Center - Floating Home Button */}
                        <Link
                            href={homeItem.path}
                            className="relative flex items-center justify-center -mt-7 mx-3"
                        >
                            {/* Floating Button */}
                            <div className={`
                                relative w-[56px] h-[56px] rounded-full flex items-center justify-center
                                bg-gradient-to-br from-blue-500 to-blue-600
                                shadow-[0_6px_20px_rgba(59,130,246,0.5)]
                                transition-all duration-200
                                hover:scale-105
                                active:scale-95
                                border-[3px] border-[#1a1f2e]
                            `}>
                                {/* Icon */}
                                <Home className="w-6 h-6 text-white relative z-10" />
                            </div>
                        </Link>

                        {/* Right Items */}
                        <div className="flex items-center gap-1">
                            {rightItems.map((item) => renderNavItem(item))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, ShoppingBag, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    path: string;
}

export function UserSidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Left side items (before home)
    const leftItems: NavItem[] = [
        { icon: ShoppingBag, label: 'STORE', path: '/user/store' },
        { icon: Search, label: 'SEARCH', path: '/user/search' },
    ];

    // Right side items (after home)
    const rightItems: NavItem[] = [
        { icon: ShoppingBag, label: 'ORDERS', path: '/user/orders' },
        { icon: MapPin, label: 'LOCATION', path: '/user/location' },
    ];

    const homeItem = { icon: Home, label: 'HOME', path: '/user' };

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
                className="group relative flex flex-col items-center justify-center py-3 px-6 transition-all duration-300"
            >
                {/* Icon */}
                <Icon className={`w-5 h-5 mb-1 transition-all duration-300 ${
                    isActive
                        ? 'text-white'
                        : 'text-white/40 group-hover:text-white/70'
                }`} />
                
                {/* Label */}
                <span className={`text-[9px] font-bold tracking-wider transition-all duration-300 ${
                    isActive
                        ? 'text-white'
                        : 'text-white/40 group-hover:text-white/70'
                }`}>
                    {item.label}
                </span>
            </Link>
        );
    };

    const isHomeActive = isPathActive(homeItem.path, true);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-6 px-4">
            <div className="relative w-full max-w-[420px] pointer-events-auto">

                {/* Main container - Dark Navy Blue like the image */}
                <div className="relative bg-[#1a2332] rounded-[28px] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

                    {/* Nav Items Container */}
                    <div className="relative flex items-center justify-center">
                        
                        {/* Left Items */}
                        <div className="flex items-center">
                            {leftItems.map((item) => renderNavItem(item))}
                        </div>

                        {/* Center - Floating Home Button */}
                        <Link
                            href={homeItem.path}
                            className="relative flex flex-col items-center justify-center -mt-9"
                        >
                            {/* Main button circle - Solid Navy Blue */}
                            <div className={`
                                relative w-[60px] h-[60px] rounded-full flex items-center justify-center
                                bg-[#1a2332]
                                shadow-xl shadow-black/40
                                transition-all duration-300
                                hover:scale-105
                                active:scale-95
                                border-[3px] border-[#1a2332]
                            `}>
                                {/* Inner circle */}
                                <div className="w-full h-full rounded-full bg-[#1a2332] flex items-center justify-center">
                                    <Home className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            
                            {/* Label below */}
                            <span className={`text-[9px] font-bold tracking-wider mt-1 transition-all duration-300 ${
                                isHomeActive ? 'text-white' : 'text-white/40'
                            }`}>
                                {homeItem.label}
                            </span>
                        </Link>

                        {/* Right Items */}
                        <div className="flex items-center">
                            {rightItems.map((item) => renderNavItem(item))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Tag, Trophy, Music, UserCircle } from 'lucide-react';
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
        { icon: Tag, label: 'Deals', path: '/user/deals' },
        { icon: Trophy, label: 'Ranks', path: '/user/ranks' },
    ];

    // Right side items (after home)
    const rightItems: NavItem[] = [
        { icon: Music, label: 'Audio', path: '/user/audio' },
        { icon: UserCircle, label: 'Profile', path: '/user/profile' },
    ];

    const homeItem = { icon: Home, label: 'Home', path: '/user' };

    const isPathActive = (path: string, isHome: boolean) => {
        if (isHome) return pathname === '/user' || pathname === '/user/';
        return pathname === path || pathname?.startsWith(path + '/');
    };

    const renderNavItem = (item: NavItem, isHome = false) => {
        const isActive = isPathActive(item.path, isHome);
        const Icon = item.icon;

        return (
            <Link
                key={item.path}
                href={item.path}
                className="group relative flex flex-col items-center justify-center py-2.5 px-5 transition-all duration-300"
            >
                <div className="relative">
                    <Icon className={`w-[23px] h-[23px] transition-all duration-300 ${
                        isActive
                            ? 'text-white/90'
                            : 'text-white/30 group-hover:text-white/50'
                    }`} />
                </div>
            </Link>
        );
    };

    const isHomeActive = isPathActive(homeItem.path, true);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-5 px-4">
            <div className="relative w-full max-w-[360px] pointer-events-auto">

                {/* Main container with dark theme */}
                <div className="relative bg-[#0d1018]/90 backdrop-blur-3xl rounded-[32px] shadow-[0_10px_50px_rgba(0,0,0,0.6)] border border-white/[0.06]">
                    
                    {/* Subtle top highlight */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Nav Items Container */}
                    <div className="relative flex items-center justify-center">
                        
                        {/* Left Items */}
                        <div className="flex items-center">
                            {leftItems.map((item) => renderNavItem(item))}
                        </div>

                        {/* Center - Floating Home Button */}
                        <Link
                            href={homeItem.path}
                            className="relative flex items-center justify-center -mt-10 mx-1"
                        >
                            {/* Outer glow effect */}
                            <div className="absolute inset-0 w-[68px] h-[68px] rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 blur-xl opacity-40 animate-pulse" />
                            
                            {/* Main button circle */}
                            <div className={`
                                relative w-[64px] h-[64px] rounded-full flex items-center justify-center
                                bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700
                                shadow-2xl shadow-blue-500/30
                                transition-all duration-500 ease-out
                                hover:scale-110 hover:shadow-blue-500/50
                                active:scale-95
                                border-4 border-[#0d1018]
                            `}>
                                {/* Inner shine overlay */}
                                <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                                
                                {/* Home icon */}
                                <Home className="w-7 h-7 text-white relative z-10 drop-shadow-lg" strokeWidth={2.5} />
                            </div>
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

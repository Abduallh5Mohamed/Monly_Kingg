'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageSquare, LogOut, User, FileText, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
}

export function UserSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems: SidebarItem[] = [
  { icon: Home, label: 'Dashboard', path: '/user/dashboard' },
  { icon: MessageSquare, label: 'Messages', path: '/user/chat', badge: 3 },
    { icon: FileText, label: 'Payments', path: '/user/payments' },
    ...(user?.isSeller ? [{ icon: Store, label: 'My Store', path: '/user/store' }] : []),
    { icon: User, label: 'Profile', path: '/user/profile' }
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    // Clear tokens
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('accessToken');
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    router.push('/login');
  };

  return (
    <div
      className={`${
        isCollapsed ? 'w-20' : 'w-20'
      } h-screen bg-gradient-to-b from-[#0f1419] via-[#1a1f2e] to-[#0a0e14] flex flex-col transition-all duration-300 fixed left-0 top-0 z-50 shadow-2xl shadow-cyan-500/10 border-r border-cyan-500/20 backdrop-blur-xl`}
    >
      {/* Logo Section with Glow Effect */}
      <div className="p-4 border-b border-cyan-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="text-center relative">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-cyan-500/50 mx-auto relative group hover:border-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/30">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="User"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          {/* Online Status Indicator */}
          <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0f1419] shadow-lg shadow-green-500/50 animate-pulse" />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <div className="space-y-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-center p-3.5 rounded-2xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-xl shadow-cyan-500/50 scale-105 border border-cyan-400/50'
                    : 'text-gray-400 hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-purple-500/10 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30'
                }`}
                title={item.label}
              >
                {/* Icon Glow Effect */}
                <div
                  className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300 ${
                    isActive ? 'bg-cyan-500/30 opacity-100' : 'opacity-0 group-hover:opacity-50 bg-cyan-500/20'
                  }`}
                />

                <Icon
                  className={`h-6 w-6 relative z-10 transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                />

                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-pink-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg shadow-red-500/50 border-2 border-[#0f1419] animate-pulse">
                    {item.badge}
                  </span>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-r-full shadow-lg shadow-cyan-500/50" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-3 border-t border-cyan-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />

        {/* Logout Button */}
        <div className="relative mb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-3 rounded-2xl text-gray-400 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-400 transition-all duration-300 group border border-transparent hover:border-red-500/30 relative overflow-hidden"
            title="Logout"
          >
            <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <LogOut className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform duration-300" />
          </button>
        </div>
        
        {/* User Avatar */}
        <div className="relative">
          <button className="w-14 h-14 rounded-full overflow-hidden border-2 border-cyan-500/50 mx-auto block hover:border-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 group relative">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="Natalie"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          
          {/* Online Status */}
          <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0f1419] shadow-lg shadow-green-500/50 animate-pulse" />
        </div>
        <p className="text-cyan-100 text-xs text-center mt-2 font-medium">Natalie</p>
      </div>
    </div>
  );
}

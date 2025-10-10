'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Users,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const menuItems: SidebarItem[] = [
    { icon: Home, label: 'Dashboard', path: '/user/dashboard' },
    { icon: MessageSquare, label: 'Messages', path: '/user-chats', badge: 3 },
    { icon: Calendar, label: 'Schedule', path: '/user/schedule' },
    { icon: FileText, label: 'Documents', path: '/user/documents' },
    { icon: Users, label: 'Groups', path: '/user/groups' },
    { icon: Bell, label: 'Notifications', path: '/user/notifications' },
    { icon: User, label: 'Profile', path: '/user/profile' },
    { icon: Settings, label: 'Settings', path: '/user/settings' },
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
      } h-screen bg-gradient-to-b from-[#1a2332] via-[#15202e] to-[#0f1720] flex flex-col transition-all duration-300 fixed left-0 top-0 z-50 shadow-2xl shadow-black/50 rounded-r-[2.5rem] border-r border-[#d4c5b9]/10`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">🍕</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-center p-3 rounded-2xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#d4c5b9] text-[#1a2332] shadow-lg shadow-[#d4c5b9]/30 scale-110'
                    : 'text-[#d4c5b9]/70 hover:bg-[#d4c5b9]/10 hover:text-[#d4c5b9]'
                }`}
                title={item.label}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-[#1a2332]' : ''}`} />
                {item.badge && (
                  <span className="absolute top-1 right-1 bg-[#d4c5b9] text-[#1a2332] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-[#d4c5b9]/50">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-3 border-t border-[#d4c5b9]/10">
        <div className="relative mb-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-3 rounded-2xl text-[#d4c5b9]/70 hover:bg-red-500/20 hover:text-[#d4c5b9] transition-all duration-200"
            title="Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
        <div className="relative">
          <button className="w-14 h-14 rounded-full overflow-hidden border-3 border-[#d4c5b9]/30 mx-auto block hover:border-[#d4c5b9]/50 transition-all">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="Natalie"
              className="w-full h-full object-cover"
            />
          </button>
          <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#1a2332]" />
          <p className="text-[#d4c5b9] text-xs text-center mt-2 font-medium">Natalie</p>
        </div>
      </div>
    </div>
  );
}

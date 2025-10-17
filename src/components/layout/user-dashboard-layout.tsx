'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserDashboardLayoutProps {
  children: React.ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e]">
      {/* Sidebar */}
      <UserSidebar />

      {/* Main Content */}
      <div className="ml-20 min-h-screen">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-[#131720]/95 to-[#1a1d2e]/95 backdrop-blur-xl border-b border-white/5 px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  placeholder="Search User, Events and more.."
                  className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full h-12 focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/10 transition-all">
                <option className="bg-[#1a1d2e]">English</option>
                <option className="bg-[#1a1d2e]">العربية</option>
              </select>

              {/* Settings */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10 text-white/60 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10 text-white/60 hover:text-white relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              </Button>

              {/* User Avatar */}
              <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500 hover:border-cyan-400 transition-all">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

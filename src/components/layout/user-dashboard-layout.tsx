'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface UserDashboardLayoutProps {
  children: React.ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const router = useRouter();

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
              {/* Level Badge - Gaming Style */}
              <div className="relative group">
                <div 
                  onClick={() => router.push('/user/profile')}
                  className="bg-gradient-to-br from-purple-600/90 to-purple-800/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-purple-400/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 transition-all cursor-pointer"
                  title="Go to Profile"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-400/50">
                      <span className="text-purple-200 text-xs font-bold">12</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-purple-200/80 leading-none">Level</p>
                      <p className="text-sm font-bold text-white leading-none">VIP</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Badge - Gaming Style */}
              <div className="relative group">
                <div 
                  onClick={() => router.push('/user/payments')}
                  className="bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-emerald-400/30 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all cursor-pointer"
                  title="Go to Payments"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-400/50">
                      <span className="text-emerald-200 text-xs font-bold">ج</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-200/80 leading-none">Balance</p>
                      <p className="text-sm font-bold text-white leading-none">2,480</p>
                    </div>
                  </div>
                </div>
              </div>

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
              <button 
                onClick={() => router.push('/user/profile')}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500 hover:border-cyan-400 hover:scale-110 transition-all cursor-pointer"
                title="Go to Profile"
              >
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

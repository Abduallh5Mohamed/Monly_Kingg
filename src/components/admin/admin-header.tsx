'use client';

import { Bell, Search, LogOut, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

export function AdminHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 md:left-20 left-0 right-0 h-16 bg-[#0f1117]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 md:px-8 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search users, orders, games..."
            className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 rounded-lg h-9 text-sm focus:border-white/20 focus:ring-0 transition-colors"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-white/[0.04] px-4 py-2 rounded-lg border border-white/[0.06]">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <span className="text-white font-medium text-sm">800.00</span>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.06]">
          <Bell className="h-4 w-4 text-white/50" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0f1117]"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 bg-white/[0.04] rounded-lg pr-3.5 pl-1.5 py-1.5 hover:bg-white/[0.08] transition-colors cursor-pointer border border-white/[0.06]">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="text-sm hidden sm:block">
            <p className="text-white/90 font-medium text-xs leading-tight">{user?.username || 'Admin'}</p>
            <p className="text-white/40 text-[10px] leading-tight">Administrator</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="ghost"
          size="sm"
          className="w-9 h-9 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

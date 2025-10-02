'use client';

import { Bell, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

export function AdminHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 md:left-20 left-0 right-0 h-16 bg-[#1a1d2e]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search users, orders, games..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
          <span className="text-yellow-500 font-bold text-sm">💰</span>
          <span className="text-white font-semibold">$ 800.00</span>
        </div>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <Bell className="h-5 w-5 text-white/60" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 bg-white/5 rounded-full pr-4 pl-1 py-1 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="text-sm">
            <p className="text-white font-medium">Hello!</p>
            <p className="text-white/60 text-xs">{user?.username || 'Admin'}</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

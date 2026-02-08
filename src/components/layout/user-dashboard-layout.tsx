'use client';

import { UserSidebar } from './user-sidebar';
import { Search, Bell, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { BecomeSellerModal } from '@/components/become-seller-modal';

interface UserDashboardLayoutProps {
  children: React.ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [sellerModalOpen, setSellerModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <UserSidebar />
      </div>

      {/* Main Content */}
      <div className="md:ml-20 min-h-screen">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-[#131720]/95 to-[#1a1d2e]/95 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
                <Input
                  placeholder="Search..."
                  className="pl-10 sm:pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full h-10 sm:h-12 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Become Seller / My Store */}
              {user && !user.isSeller && (
                <button
                  onClick={() => setSellerModalOpen(true)}
                  className="relative group flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.03]"
                  title="Become a Seller"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Store className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors relative z-10" />
                  <span className="hidden sm:inline text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 transition-colors relative z-10">Become Seller</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 border-2 border-[#131720] animate-pulse shadow-lg shadow-cyan-400/50" />
                </button>
              )}
              {user?.isSeller && (
                <button
                  onClick={() => router.push('/user/store')}
                  className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.03]"
                  title="My Store"
                >
                  <Store className="h-4 w-4 text-green-400" />
                  <span className="hidden sm:inline text-xs font-semibold text-green-300">My Store</span>
                </button>
              )}

              {/* Level Badge - hidden on very small screens */}
              <div className="relative group hidden sm:block">
                <div
                  onClick={() => router.push('/user/profile')}
                  className="bg-gradient-to-br from-purple-600/90 to-purple-800/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-purple-400/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 transition-all cursor-pointer"
                  title="Go to Profile"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-400/50">
                      <span className="text-purple-200 text-[10px] sm:text-xs font-bold">12</span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] text-purple-200/80 leading-none">Level</p>
                      <p className="text-sm font-bold text-white leading-none">VIP</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Badge */}
              <div className="relative group hidden sm:block">
                <div
                  onClick={() => router.push('/user/payments')}
                  className="bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-emerald-400/30 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all cursor-pointer"
                  title="Go to Payments"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-400/50">
                      <span className="text-emerald-200 text-[10px] sm:text-xs font-bold">$</span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] text-emerald-200/80 leading-none">Balance</p>
                      <p className="text-sm font-bold text-white leading-none">2,480</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10 text-white/60 hover:text-white relative h-9 w-9 sm:h-10 sm:w-10"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              </Button>

              {/* User Avatar */}
              <button
                onClick={() => router.push('/user/profile')}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-cyan-500 hover:border-cyan-400 hover:scale-110 transition-all cursor-pointer flex-shrink-0"
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

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f1419]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 safe-area-bottom">
          <div className="flex items-center justify-around">
            {[
              { icon: '🏠', label: 'Home', path: '/user/dashboard' },
              { icon: '💬', label: 'Chat', path: '/user/chat' },
              { icon: '💳', label: 'Pay', path: '/user/payments' },
              { icon: '👤', label: 'Profile', path: '/user/profile' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-white/50 hover:text-white transition-all"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Become Seller Modal */}
      <BecomeSellerModal isOpen={sellerModalOpen} onClose={() => setSellerModalOpen(false)} />
    </div>
  );
}

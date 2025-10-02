'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  Settings,
  BarChart3,
  Gamepad2,
  Shield,
  Bell
} from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
  { icon: MessageSquare, label: 'Chats', href: '/admin/chats' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Gamepad2, label: 'Games', href: '/admin/games' },
  { icon: Shield, label: 'Security', href: '/admin/security' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#1a1d2e] border-r border-white/10 flex flex-col items-center py-6 z-50 md:flex hidden">
      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col gap-4 w-full items-center pt-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group",
                isActive
                  ? "bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/50"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-white" : "text-white/60 group-hover:text-white"
              )} />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Avatar at Bottom */}
      <div className="mt-auto">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow">
          A
        </div>
      </div>
    </aside>
  );
}

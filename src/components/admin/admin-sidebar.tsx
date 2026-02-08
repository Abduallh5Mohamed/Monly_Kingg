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
  Bell,
  Store
} from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
  { icon: Store, label: 'Sellers', href: '/admin/sellers' },
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
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0f1117] border-r border-white/[0.06] flex flex-col items-center py-6 z-50 md:flex hidden">
      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col gap-1.5 w-full items-center pt-4 px-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 relative group",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
              )}
              <Icon className="h-[18px] w-[18px]" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#131620] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/[0.06] shadow-xl">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Avatar at Bottom */}
      <div className="mt-auto">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity">
          A
        </div>
      </div>
    </aside>
  );
}

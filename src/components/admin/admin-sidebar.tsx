'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ArrowRightLeft,
  MessageSquare,
  Settings,
  BarChart3,
  Gamepad2,
  Shield,
  Bell,
  Store,
  Megaphone,
  Image as ImageIcon,
  Percent,
  TrendingUp,
  UserCog,
  LifeBuoy,
} from 'lucide-react';

/** Each item optionally requires a permission key. null = always visible. */
interface SidebarItem {
  icon: any;
  label: string;
  href: string;
  permissionKey: string | null;
}

const allSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', permissionKey: null },
  { icon: Users, label: 'Users', href: '/admin/users', permissionKey: 'users' },
  { icon: Package, label: 'Products', href: '/admin/products', permissionKey: 'products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders', permissionKey: 'orders' },
  { icon: ArrowRightLeft, label: 'Transactions', href: '/admin/transactions', permissionKey: 'orders' },
  { icon: Store, label: 'Sellers', href: '/admin/sellers', permissionKey: 'sellers' },
  { icon: TrendingUp, label: 'Seller Levels', href: '/admin/seller-levels', permissionKey: 'seller_levels' },
  { icon: Megaphone, label: 'Promotions', href: '/admin/promotions', permissionKey: 'promotions' },
  { icon: ImageIcon, label: 'Ads', href: '/admin/ads', permissionKey: 'ads' },
  { icon: Percent, label: 'Discounts', href: '/admin/discounts', permissionKey: 'discounts' },
  { icon: MessageSquare, label: 'Chats', href: '/admin/chats', permissionKey: 'chats' },
  { icon: LifeBuoy, label: 'Tickets', href: '/admin/tickets', permissionKey: null },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics', permissionKey: 'analytics' },
  { icon: Gamepad2, label: 'Games', href: '/admin/games', permissionKey: 'games' },
  { icon: Shield, label: 'Security', href: '/admin/security', permissionKey: 'security' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications', permissionKey: 'notifications' },
  { icon: UserCog, label: 'Moderators', href: '/admin/moderators', permissionKey: null }, // admin-only, filtered below
  { icon: Settings, label: 'Settings', href: '/admin/settings', permissionKey: 'settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>('admin');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/v1/admin/my-permissions', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setRole(data.data.role);
          setPermissions(data.data.permissions);
        }
      })
      .catch(() => { })
      .finally(() => setLoaded(true));
  }, []);

  // Filter sidebar items based on role & permissions
  const visibleItems = allSidebarItems.filter(item => {
    // Users page & Moderators page: only visible to admins
    if (item.href === '/admin/moderators' || item.href === '/admin/users') return role === 'admin';
    // Dashboard: only visible to admins (moderators land on their first permitted page)
    if (item.href === '/admin') return role === 'admin';
    // No permission key = always visible
    if (!item.permissionKey) return true;
    // Admins see everything
    if (role === 'admin') return true;
    // Moderators only see permitted sections
    return permissions.includes(item.permissionKey);
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0f1117] border-r border-white/[0.06] flex flex-col items-center py-6 z-50 md:flex hidden">
      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col gap-1.5 w-full items-center pt-4 px-2 overflow-y-auto scrollbar-hide">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 relative group flex-shrink-0",
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
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity",
          role === 'admin'
            ? "bg-gradient-to-br from-indigo-500 to-violet-600"
            : "bg-gradient-to-br from-blue-500 to-cyan-600"
        )}>
          {role === 'admin' ? 'A' : 'M'}
        </div>
      </div>
    </aside>
  );
}

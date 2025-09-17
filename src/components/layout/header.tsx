
'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Games', href: '#' },
    { name: 'Accounts', href: '#' },
    { name: 'Sell', href: '/sell' },
    { name: 'Support', href: '#' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex-1 flex justify-start">
          <Logo />
        </div>
        <ul className="hidden md:flex items-center justify-center space-x-2 bg-black/30 backdrop-blur-md rounded-full px-4 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300",
                    isActive
                      ? "bg-primary/50 text-white"
                      : "text-foreground/70 hover:text-white"
                  )}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="flex-1 flex justify-end">
          <Button className="font-bold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300">
            <UserPlus className="mr-2 h-4 w-4" />
            Create Account
          </Button>
        </div>
      </nav>
    </header>
  );
}

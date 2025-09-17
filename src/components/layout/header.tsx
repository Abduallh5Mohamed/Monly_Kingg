
'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';


export function Header() {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(pathname);

  useEffect(() => {
    setActivePath(pathname);
  }, [pathname]);

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
            const isActive = activePath === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300",
                    isActive
                      ? "bg-primary/80 text-primary-foreground"
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
          <Button className="font-bold rounded-full bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </nav>
    </header>
  );
}

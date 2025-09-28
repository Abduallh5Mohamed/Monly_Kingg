'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { useEffect, useState } from 'react';

export function Header() {
  const [activeSection, setActiveSection] = useState('home');

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'Games', href: '#games' },
    { name: 'Sell', href: '/sell' },
    { name: 'Support', href: '#support' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems
        .map(item => (item.href.startsWith('#') ? document.querySelector(item.href) : null))
        .filter(Boolean);
      
      const scrollPosition = window.scrollY + 150;

      let currentSection = 'home';
      for (const section of sections) {
        if (section && section.offsetTop <= scrollPosition && section.offsetTop + section.clientHeight > scrollPosition) {
            currentSection = section.id;
            break;
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navItems]);


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex-1 flex justify-start">
          <Logo />
        </div>
        <ul className="hidden md:flex items-center justify-center space-x-2 md:space-x-4 lg:space-x-8">
          {navItems.map((item) => {
            const isActive = item.href === `#${activeSection}` || (item.href === '/sell' && activeSection === 'sell-page');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-[#8A704D]/80 text-white"
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
          <Link href="/register">
            <Button className="font-bold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

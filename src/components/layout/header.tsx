'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus, LogOut, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';


export function Header() {
  const [activeSection, setActiveSection] = useState('home');
  const { user, logout, isAuthenticated, loading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'Games', href: '#games' },

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
        const element = section as HTMLElement;
        if (element && element.offsetTop <= scrollPosition && element.offsetTop + element.clientHeight > scrollPosition) {
            currentSection = element.id;
            break;
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navItems]);

  const handleLogout = async () => {
    await logout();
  };


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Logo />
        </div>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center justify-center space-x-1 xl:space-x-2">
          {navItems.map((item) => {
            const isActive = item.href === `#${activeSection}`;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-foreground/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            </div>
          ) : isAuthenticated && user ? (
            <>
              {/* User Info - Desktop */}
              <Link href="/user/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="text-white text-xs font-medium max-w-[100px] truncate">{user.username}</span>
              </Link>

              {user.role === 'admin' && (
                <Link href="/admin" className="hidden sm:block">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="font-bold rounded-full border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 text-xs h-8 px-3"
                  >
                    Admin
                  </Button>
                </Link>
              )}
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="hidden sm:flex rounded-full text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 w-8 p-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-bold rounded-full text-white hover:bg-white/10 text-xs sm:text-sm h-8 sm:h-9">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-bold rounded-full bg-primary hover:bg-primary/80 text-white text-xs sm:text-sm h-8 sm:h-9">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                  Sign Up
                </Button>
              </Link>
              {/* Mobile hamburger for non-auth */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                {item.name}
              </Link>
            ))}
            {isAuthenticated && user && (
              <>
                <div className="border-t border-white/10 my-2" />
                <Link
                  href="/user/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User className="h-4 w-4 text-primary" />
                  Dashboard
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-all"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </header>
  );
}

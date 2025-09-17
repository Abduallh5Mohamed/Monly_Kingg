import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export function Header() {
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Games', href: '#' },
    { name: 'Accounts', href: '#' },
    { name: 'Sell', href: '/sell' },
    { name: 'Support', href: '#' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex-1 flex justify-start">
          <Logo />
        </div>
        <ul className="hidden md:flex items-center justify-center space-x-8">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors duration-300">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex-1 flex justify-end">
          <Button className="font-bold shadow-[0_0_10px_hsl(var(--accent)/0.7)] hover:shadow-[0_0_20px_hsl(var(--accent))] transition-all duration-300 bg-accent/90 hover:bg-accent text-white">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </nav>
    </header>
  );
}

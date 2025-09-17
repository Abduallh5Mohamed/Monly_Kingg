'use client';

import { Logo } from '../logo';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Games', href: '#' },
    { name: 'Accounts', href: '#' },
    { name: 'Sell', href: '/sell' },
    { name: 'Support', href: '#' },
  ];

  const paymentMethods = [
    { name: 'Vodafone Cash', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Vodafone_icon.svg/200px-Vodafone_icon.svg.png' },
    { name: 'PayPal', logo: '/assets/paypal.png' },
    { name: 'InstaPay', logo: '/assets/instapay.png' },
  ];

  return (
    <footer className="bg-card/20 border-t border-border/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center md:items-start">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground text-center md:text-left max-w-xs">
              Your Gateway to the Premium Game Accounts & Unmatched Powers.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <h3 className="font-headline text-lg text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <h3 className="font-headline text-lg text-white mb-4">We Accept</h3>
            <div className="flex items-center space-x-4">
              {paymentMethods.map((method) => (
                <div key={method.name} className="p-2 bg-white/10 rounded-lg flex items-center justify-center h-[41px]">
                  <Image src={method.logo} alt={method.name} width={40} height={25} className="object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/20 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Monly King. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { Logo } from '../logo';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '../ui/separator';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Games', href: '#featured-games' },
    { name: 'About', href: '#why-us' },
    { name: 'Sell', href: '/sell' },
    { name: 'Support', href: '#support' },
  ];

  const paymentMethods = [
    { name: 'Vodafone Cash', logo: 'https://www.clipartmax.com/png/middle/151-1517832_pay-with-vodafone-cash-vodafone-mobile-money-logo.png' },
    { name: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png' },
    { name: 'InstaPay', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png?20230411102327' },
  ];

  return (
    <footer id="footer" className="bg-card/20 border-t border-border/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-4 flex flex-col items-center md:items-start">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground text-center md:text-left max-w-xs">
              Your Gateway to the Premium Game Accounts & Unmatched Powers.
            </p>
          </div>
          
          <div className="md:col-span-2 flex flex-col items-center md:items-start">
            <h3 className="font-headline text-lg text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-center md:text-left">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-3 flex flex-col items-center md:items-start">
            <h3 className="font-headline text-lg text-white mb-4">We Accept</h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {paymentMethods.map((method) => (
                <div key={method.name} className="p-2 bg-white/10 rounded-lg flex items-center justify-center h-12">
                  <Image 
                    src={method.logo} 
                    alt={method.name} 
                    width={method.name === 'InstaPay' ? 100 : 80}
                    height={30}
                    className="object-contain h-full w-auto"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col items-center md:items-start">
             <h3 className="font-headline text-lg text-white mb-4">Connect With Us</h3>
             <div className="flex items-center gap-4">
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-6 w-6" />
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-6 w-6" />
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="h-6 w-6" />
                </Link>
             </div>
          </div>

        </div>
        
        <Separator className="my-8 bg-border/20" />

        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Monly King. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

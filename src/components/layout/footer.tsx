'use client';

import { Logo } from '../logo';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Gamepad2, Shield, Headphones, CreditCard, 
  ChevronRight, Send, ExternalLink,
  Twitter, MessageCircle, Youtube, Instagram
} from 'lucide-react';

const quickLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Games', href: '#games' },
  { name: 'Features', href: '#features' },
  { name: 'Support', href: '#support' },
];

const accountLinks = [
  { name: 'Login', href: '/login' },
  { name: 'Register', href: '/register' },
  { name: 'Dashboard', href: '/user/dashboard' },
  { name: 'Become a Seller', href: '/register' },
];

const gameCategories = [
  { name: 'Valorant' },
  { name: 'PUBG Mobile' },
  { name: 'FIFA / FC' },
  { name: 'League of Legends' },
  { name: 'Call of Duty' },
];

const features = [
  { icon: Shield, text: 'Secure Trading' },
  { icon: CreditCard, text: 'Easy Payments' },
  { icon: Headphones, text: '24/7 Support' },
  { icon: Gamepad2, text: '500+ Games' },
];

const paymentMethods = [
  { name: 'Vodafone Cash', logo: 'https://www.clipartmax.com/png/middle/151-1517832_pay-with-vodafone-cash-vodafone-mobile-money-logo.png' },
  { name: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png' },
  { name: 'InstaPay', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png?20230411102327' },
];

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/30' },
  { icon: MessageCircle, href: '#', label: 'Discord', color: 'hover:text-indigo-400 hover:bg-indigo-400/10 hover:border-indigo-400/30' },
  { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30' },
  { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-400 hover:bg-pink-400/10 hover:border-pink-400/30' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#060810] border-t border-white/5 overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Features Bar */}
      <div className="relative border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300 group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/15 transition-all flex-shrink-0">
                  <feature.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </div>
                <span className="text-[11px] sm:text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Logo />
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              The most trusted marketplace for buying and selling gaming accounts. 
              Safe transactions, verified sellers, and premium accounts for all your favorite games.
            </p>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Stay Updated</p>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-[260px]">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full h-10 px-4 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                  />
                </div>
                <button className="h-10 w-10 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white flex items-center justify-center hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-2 pt-1">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 transition-all duration-300 ${social.color}`}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-cyan-500" />
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-white/45 hover:text-cyan-400 transition-all duration-200"
                  >
                    <ChevronRight className="h-3 w-3 text-white/20 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all duration-200" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-purple-500" />
              Account
            </h3>
            <ul className="space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-white/45 hover:text-purple-400 transition-all duration-200"
                  >
                    <ChevronRight className="h-3 w-3 text-white/20 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all duration-200" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Games */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              Popular Games
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gameCategories.map((game) => (
                <Link
                  key={game.name}
                  href="#games"
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors">{game.name}</span>
                  <ExternalLink className="h-3 w-3 text-white/0 group-hover:text-emerald-500/60 ml-auto transition-all duration-200" />
                </Link>
              ))}
            </div>

            {/* Payment Methods */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">We Accept</p>
              <div className="flex flex-wrap items-center gap-3">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.name} 
                    className="px-3 py-2 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all flex items-center justify-center h-10"
                  >
                    <Image
                      src={method.logo}
                      alt={method.name}
                      width={method.name === 'InstaPay' ? 80 : 60}
                      height={24}
                      className="object-contain h-full w-auto opacity-70 hover:opacity-100 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30 text-center sm:text-left">
              &copy; {currentYear} <span className="text-white/50 font-medium">Monly King</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</Link>
              <span className="text-white/10">|</span>
              <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms of Service</Link>
              <span className="text-white/10">|</span>
              <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />

      <div className="flex-grow flex items-center justify-center px-4 py-32">
        {/* Glow orbs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-lg">
          {/* 404 number */}
          <div className="relative mb-6">
            <h1 className="text-[10rem] md:text-[12rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-white/5 select-none">
              404
            </h1>
            <h1 className="absolute inset-0 text-[10rem] md:text-[12rem] font-black leading-none text-glow text-primary/80">
              404
            </h1>
          </div>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Page Not Found
          </h2>
          <p className="text-foreground/50 text-base md:text-lg mb-10 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved to another location.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full transition-all duration-300 button-glow"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              onClick={() => typeof window !== 'undefined' && window.history.back()}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium rounded-full border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

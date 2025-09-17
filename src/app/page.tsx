'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Header } from '@/components/layout/header';
import { AccountCarousel } from '@/components/account-carousel';

const CircuitBackground = () => (
  <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circuit" patternUnits="userSpaceOnUse" width="40" height="40">
          <path d="M0 10h10v10H0zM10 0v10h10V0zM20 10h10v10H20zM30 20v10h10V20zM10 20v10h10V20zM0 30h10v10H0zM20 30h10v10H20z" stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none" />
          <path d="M10 5h10M5 10v10M15 20h10M25 10v10M35 20v10M5 30v10M15 30h10" stroke="hsl(var(--accent))" strokeWidth="0.5" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  </div>
);


export default function Home() {
  const heroBg = PlaceHolderImages.find(img => img.id === 'hero-background');
  const warriorImg = PlaceHolderImages.find(img => img.id === 'cyber-warrior');

  return (
    <div className="relative min-h-screen w-full bg-background overflow-x-hidden">
      {heroBg && (
        <Image
          src={heroBg.imageUrl}
          alt={heroBg.description}
          fill
          quality={100}
          className="object-cover object-center"
          data-ai-hint={heroBg.imageHint}
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background z-10" />
      <CircuitBackground />
      <Header />
      <main className="relative container mx-auto px-4 z-20">
        <section className="min-h-screen flex items-center pt-24 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
              <h1 className="text-5xl md:text-7xl font-headline font-bold text-glow uppercase tracking-wider">
                Dominate the Ranks
              </h1>
              <p className="text-lg md:text-xl max-w-lg text-foreground/80">
                Your Gateway to Premium Game Accounts & Unmatched Powers
              </p>
              <Button size="lg" className="text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover">
                <PlayCircle className="mr-3 h-6 w-6" />
                Explore the Universe
              </Button>
              <div className="pt-8 w-full max-w-lg">
                <AccountCarousel />
              </div>
            </div>
            <div className="relative hidden lg:flex justify-center items-center h-full">
              {warriorImg && (
                <Image
                  src={warriorImg.imageUrl}
                  alt={warriorImg.description}
                  width={500}
                  height={667}
                  quality={95}
                  className="object-contain drop-shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow"
                  data-ai-hint={warriorImg.imageHint}
                  style={{
                    animation: 'float 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 1rem hsl(var(--primary)/0.7)) drop-shadow(0 0 0.5rem hsl(var(--accent)/0.5))',
                  }}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .button-glow-hover {
          box-shadow: 0 0 16px 4px hsl(var(--primary) / 0.7), 0 0 40px 8px hsl(var(--primary) / 0.4);
        }
      `}</style>
    </div>
  );
}

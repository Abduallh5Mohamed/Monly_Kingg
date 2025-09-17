'use client';

import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Header } from '@/components/layout/header';
import { AccountCarousel } from '@/components/account-carousel';
import Image from 'next/image';
import { CircuitBackground } from '../layout/circuit-background';

export function HeroSection() {
  const warriorImg = PlaceHolderImages.find(img => img.id === 'cyber-warrior');

  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center"
      >
        <source src="/assets/Hero-Background.mp4" type="video/mp4" />
      </video>
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
    </>
  );
}

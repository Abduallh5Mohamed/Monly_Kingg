'use client';

import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Header } from '@/components/layout/header';
import { AccountCarousel } from '@/components/account-carousel';
import Image from 'next/image';
import { CircuitBackground } from '../layout/circuit-background';
import { FeaturedGames } from '../featured-games';

export function HeroSection() {
  const warriorImg = PlaceHolderImages.find(img => img.id === 'cyber-warrior');

  const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20V4L19 12L5 20Z" fill="currentColor"/>
    </svg>
  );

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
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              <h1 className="text-6xl md:text-8xl font-headline font-bold text-white uppercase leading-none">
                Dominate <br/> Of Ranks
              </h1>
              <p className="text-sm md:text-base max-w-md text-foreground/70">
                Your Gateway to the Premium Game Accounts & Unmatched Powers.
              </p>
              <Button size="lg" className="text-base font-bold rounded-full bg-white text-black hover:bg-white/90 transition-all duration-300 pl-6 pr-4 group">
                EXPLORE THE UNIVERSE
                <span className="ml-3 h-8 w-8 rounded-full bg-black flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
                  <PlayIcon />
                </span>
              </Button>
              <div className="pt-8 w-full max-w-2xl">
                <h2 className="text-xl font-bold font-headline text-white mb-4 text-left">TRENDING ACCOUNTS</h2>
                <AccountCarousel />
              </div>
            </div>
            <div className="relative hidden lg:flex flex-col justify-center items-center h-full gap-8">
              {warriorImg && (
                <Image
                  src={warriorImg.imageUrl}
                  alt={warriorImg.description}
                  width={400}
                  height={533}
                  quality={95}
                  className="object-contain drop-shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow"
                  data-ai-hint={warriorImg.imageHint}
                  style={{
                    animation: 'float 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 1rem hsl(var(--primary)/0.7)) drop-shadow(0 0 0.5rem hsl(var(--accent)/0.5))',
                  }}
                />
              )}
              <FeaturedGames />
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

'use client';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { AccountCarousel } from '@/components/account-carousel';
import { CircuitBackground } from '../layout/circuit-background';
import Image from 'next/image';
import Snowfall from '../layout/snowfall';

export function HeroSection() {

  const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20V4L19 12L5 20Z" fill="currentColor"/>
    </svg>
  );

  return (
    <div id="home" className="relative min-h-screen w-full bg-background overflow-x-hidden">
       <Snowfall className="hero-snow" />
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
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <h1 className="text-6xl md:text-8xl font-bold text-white uppercase font-headline" style={{ transform: 'scaleY(0.88)' }}>
                Dominate <br/> Of Ranks
              </h1>
              <div className="space-y-2 -mt-4">
                <p className="text-sm md:text-base max-w-md text-foreground/70 lg:pl-4">
                  Your Gateway to the Premium Game Accounts & Unmatched Powers.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                  <Button size="lg" className="text-base font-bold rounded-full bg-white text-black hover:bg-white/90 transition-all duration-300 pl-6 pr-1 group">
                    EXPLORE THE UNIVERSE
                    <span className="ml-3 h-10 w-10 rounded-full bg-black flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
                      <PlayIcon />
                    </span>
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = '/support'}
                    className="text-base font-bold rounded-full bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-green-500/50"
                  >
                    💬 Live Support
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = '/admin'}
                    className="text-base font-bold rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                  >
                    🎮 Admin Dashboard
                  </Button>
                </div>
              </div>
              <div className="pt-12 w-full max-w-2xl">
                <h2 className="text-xl font-bold font-headline text-white mb-4 text-left uppercase tracking-wide">TRENDING ACCOUNTS</h2>
                <AccountCarousel />
              </div>
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
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .button-glow-hover {
          box-shadow: 0 0 16px 4px hsl(var(--primary) / 0.7), 0 0 40px 8px hsl(var(--primary) / 0.4);
        }
      `}</style>
    </div>
  );
}

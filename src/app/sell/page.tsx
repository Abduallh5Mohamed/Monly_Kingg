'use client';
import { Header } from '@/components/layout/header';
import { SellForm } from '@/components/sell-form';
import { CircuitBackground } from '@/components/layout/circuit-background';

export default function SellPage() {

  return (
    <div className="relative min-h-screen w-full bg-background overflow-x-hidden">
       <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center"
      >
        <source src="/assets/Hero-Background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/90 to-background z-10" />
      <CircuitBackground />
      <Header />
      <main className="relative container mx-auto px-4 z-30 pt-32 pb-16">
        <SellForm />
      </main>
    </div>
  );
}

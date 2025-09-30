'use client';
import { Header } from '@/components/layout/header';
import { ResendCodeForm } from '@/components/resend-code-form';
import { CircuitBackground } from '@/components/layout/circuit-background';

export default function ResendCodePage() {

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Login Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
      />
      <div className="absolute inset-0 bg-black/50 z-10" />
      <Header />
      <main className="relative container mx-auto px-4 z-30 pt-32 pb-16 flex items-center justify-center min-h-screen">
        <ResendCodeForm />
      </main>
    </div>
  );
}

'use client';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { VerifyEmailForm } from '@/components/verify-email-form';
import { CircuitBackground } from '@/components/layout/circuit-background';

export default function VerifyEmailPage() {

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
        <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </div>
  );
}

'use client';
import { Header } from '@/components/layout/header';
import { CyberRegisterForm } from '@/components/cyber-register-form';

export default function RegisterPage() {

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Remove video background for cyber theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black z-10" />
      <Header />
      <main className="relative container mx-auto px-4 z-30 pt-32 pb-16 flex items-center justify-center min-h-screen">
        <CyberRegisterForm />
      </main>
    </div>
  );
}

'use client';
import { Header } from '@/components/layout/header';
import ModernLoginForm from '@/components/modern-login-form';
import { ForceEnglishDocument } from '@/components/layout/force-english-document';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ForceEnglishDocument />
      <Header />
      <ModernLoginForm />
    </div>
  );
}

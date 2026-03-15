'use client';
import { Header } from '@/components/layout/header';
import ModernRegisterForm from '@/components/modern-register-form';
import { ForceEnglishDocument } from '@/components/layout/force-english-document';

export default function RegisterPage() {
  return (
    <div className="relative">
      <ForceEnglishDocument />
      <Header />
      <ModernRegisterForm />
    </div>
  );
}

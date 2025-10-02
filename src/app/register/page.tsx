خ'use client';
import { Header } from '@/components/layout/header';
import ModernRegisterForm from '@/components/modern-register-form';

export default function RegisterPage() {
  return (
    <div className="relative">
      <Header />
      <ModernRegisterForm />
    </div>
  );
}

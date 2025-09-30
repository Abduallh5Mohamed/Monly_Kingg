'use client';
import { Header } from '@/components/layout/header';
import ModernLoginForm from '@/components/modern-login-form';

export default function LoginPage() {
  return (
    <div className="relative">
      <Header />
      <ModernLoginForm />
    </div>
  );
}

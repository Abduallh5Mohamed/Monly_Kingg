'use client';
import { Header } from '@/components/layout/header';
import ForgotPasswordForm from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="relative">
      <Header />
      <ForgotPasswordForm />
    </div>
  );
}
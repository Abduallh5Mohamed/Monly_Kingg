'use client';
import { Header } from '@/components/layout/header';
import ForgotPasswordForm from '@/components/forgot-password-form';
import { ForceEnglishDocument } from '@/components/layout/force-english-document';

export default function ForgotPasswordPage() {
  return (
    <div className="relative">
      <ForceEnglishDocument />
      <Header />
      <ForgotPasswordForm />
    </div>
  );
}
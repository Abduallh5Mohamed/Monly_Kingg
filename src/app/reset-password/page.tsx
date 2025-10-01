'use client';
import { Header } from '@/components/layout/header';
import ResetPasswordForm from '@/components/reset-password-form';

export default function ResetPasswordPage() {
    return (
        <div className="relative">
            <Header />
            <ResetPasswordForm />
        </div>
    );
}
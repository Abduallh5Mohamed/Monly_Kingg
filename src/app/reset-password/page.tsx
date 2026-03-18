'use client';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import ResetPasswordForm from '@/components/reset-password-form';
import { ForceEnglishDocument } from '@/components/layout/force-english-document';

export default function ResetPasswordPage() {
    return (
        <div className="relative">
            <ForceEnglishDocument />
            <Header />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { SocketProvider } from '@/lib/socket-context';
import { LanguageProvider } from '@/lib/language-context';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SocketProvider>
          {children}
          <Toaster />
        </SocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

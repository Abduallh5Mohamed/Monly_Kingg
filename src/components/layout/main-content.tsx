'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface MainContentProps {
  children: ReactNode;
}

const NO_BOTTOM_PADDING_PATHS = [
  '/login',
  '/register',
  '/verify-email',
  '/resend-code',
  '/forgot-password',
  '/reset-password',
];

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();

  const disableBottomPadding = NO_BOTTOM_PADDING_PATHS.some((path) =>
    pathname?.startsWith(path)
  );

  return (
    <main className={`flex-grow z-20 ${disableBottomPadding ? 'pb-0' : 'pb-16'}`}>
      {children}
    </main>
  );
}

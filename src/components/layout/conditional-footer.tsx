'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on authentication pages (login, register, verify-email, resend-code)
  const hideFooterPaths = ['/login', '/register', '/verify-email', '/resend-code'];
  
  if (hideFooterPaths.includes(pathname)) {
    return null;
  }
  
  return <Footer />;
}
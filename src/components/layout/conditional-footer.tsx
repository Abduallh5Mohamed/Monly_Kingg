'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on authentication pages and admin dashboard
  const hideFooterPaths = ['/login', '/register', '/verify-email', '/resend-code'];
  
  // Hide footer if path starts with /admin
  if (hideFooterPaths.includes(pathname) || pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Footer />;
}
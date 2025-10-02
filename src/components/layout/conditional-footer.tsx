'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on authentication pages, admin dashboard, and support chat
  const hideFooterPaths = ['/login', '/register', '/verify-email', '/resend-code', '/support'];
  
  // Hide footer if path starts with /admin
  if (hideFooterPaths.includes(pathname) || pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Footer />;
}
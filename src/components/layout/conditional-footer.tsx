'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on authentication pages, admin dashboard, user dashboard, and support/chat pages
  const hideFooterPaths = ['/login', '/register', '/verify-email', '/resend-code', '/user/chat'];

  // Hide footer if path starts with /admin or /user (dashboard area)
  if (
    hideFooterPaths.includes(pathname) ||
    pathname.startsWith('/admin') ||
    pathname === '/user' ||
    pathname.startsWith('/user/')
  ) {
    return null;
  }

  return <Footer />;
}
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Skip static assets — they're handled by Express/Next.js with immutable caching
  if (pathname.startsWith('/_next/') || pathname.startsWith('/assets/')) {
    return response;
  }

  // ✅ SECURITY: Protect /user routes — authenticated regular users only (NOT admins)
  if (pathname.startsWith('/user') || pathname.startsWith('/complete-profile')) {
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Decode JWT to check role — admins must NOT access user pages
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.role === 'admin') {
        // Admin has no user account — redirect to admin dashboard
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    } catch {
      // Malformed token — redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // ✅ SECURITY: Protect /admin routes at the server level
  if (pathname.startsWith('/admin')) {
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      // No token — show 404 (hide admin existence)
      const notFoundUrl = new URL('/not-found', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }

    // Decode JWT payload to check role
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.role !== 'admin') {
        // Regular user — show 404 (hide admin existence)
        const notFoundUrl = new URL('/not-found', request.url);
        return NextResponse.rewrite(notFoundUrl);
      }
    } catch {
      // Malformed token — show 404
      const notFoundUrl = new URL('/not-found', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }
  }

  // All dynamic pages & API routes: no browser cache (always get fresh content)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon\\.ico|assets/).*)',
  ],
};

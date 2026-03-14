import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

type JwtPayload = {
  role?: string;
} | null;

async function verifyAccessToken(accessToken: string): Promise<JwtPayload> {
  const secretValue = process.env.JWT_SECRET;
  if (!secretValue) {
    throw new Error('JWT_SECRET is not configured');
  }

  const secret = new TextEncoder().encode(secretValue);
  const { payload } = await jwtVerify(accessToken, secret);
  return payload as JwtPayload;
}

export async function middleware(request: NextRequest) {
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

    try {
      const payload = await verifyAccessToken(accessToken);
      if (payload?.role === 'admin' || payload?.role === 'moderator') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // ✅ SECURITY: Protect /admin routes at the server level
  if (pathname.startsWith('/admin')) {
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      // SECURITY FIX: [LOW-02] Log unauthorized admin route access attempts.
      console.warn('[SECURITY FIX: [LOW-02]] Unauthorized admin access attempt: missing token');
      // No token — show 404 (hide admin existence)
      const notFoundUrl = new URL('/not-found', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }

    try {
      const payload = await verifyAccessToken(accessToken);
      if (payload?.role !== 'admin' && payload?.role !== 'moderator') {
        // SECURITY FIX: [LOW-02] Log unauthorized role trying to access admin routes.
        console.warn('[SECURITY FIX: [LOW-02]] Unauthorized admin access attempt: invalid role');
        const notFoundUrl = new URL('/not-found', request.url);
        return NextResponse.rewrite(notFoundUrl);
      }
    } catch {
      // SECURITY FIX: [LOW-02] Token invalid/expired on admin access.
      console.warn('[SECURITY FIX: [LOW-02]] Unauthorized admin access attempt: invalid token');
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

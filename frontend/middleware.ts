import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Matcher for protected routes
export const config = {
  matcher: [
    '/wallet/:path*',
    '/sell/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
  ],
};

// JWT verification helper (simplified - in production use proper JWT library)
function verifyJWT(token: string): { valid: boolean; payload?: any } {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from Authorization cookie or session cookie
  const authCookie = request.cookies.get('Authorization')?.value;
  const sessionCookie = request.cookies.get('session')?.value;
  const token = authCookie || sessionCookie;

  // If no token, redirect to signup with redirect parameter
  if (!token) {
    const redirectUrl = new URL('/auth/signup', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Verify JWT
  const verification = verifyJWT(token);
  if (!verification.valid) {
    const redirectUrl = new URL('/auth/signup', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const payload = verification.payload!;

  // Admin route verification
  if (pathname.startsWith('/admin')) {
    if (payload.role !== 'admin') {
      // Redirect authenticated non-admin users to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Add X-User-Id header to forwarded request
  const response = NextResponse.next();
  response.headers.set('X-User-Id', payload.userId || payload.sub || '');
  
  return response;
}

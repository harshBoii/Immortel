import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'auth';

function hasValidAuthCookie(request: NextRequest): boolean {
  const cookie = request.cookies.get(AUTH_COOKIE);
  if (!cookie?.value) return false;
  const parts = cookie.value.split('.');
  return parts.length >= 3;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isCronApi = pathname.startsWith('/api/cron');
  const isVideosDownloadApi =
    pathname.startsWith('/api/videos') && pathname.endsWith('/download');
  const isMicroservicesApi = pathname.startsWith('/api/receive-intel');
  const isPublic = isLoginPage || isAuthApi || isCronApi || isVideosDownloadApi || isMicroservicesApi;

  if (isPublic) {
    if (isLoginPage && hasValidAuthCookie(request)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!hasValidAuthCookie(request)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

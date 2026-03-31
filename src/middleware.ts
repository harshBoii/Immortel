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
  const isDevLoginPage = pathname === '/dev/login';
  const isLandingPage = pathname === '/landing';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isCronApi = pathname.startsWith('/api/cron');
  const isVideosDownloadApi =
    pathname.startsWith('/api/videos') && pathname.endsWith('/download');
  const isMicroservicesApi = pathname.startsWith('/api/receive-intel');
  const isDataMineApi = pathname.startsWith('/api/geo/company-data');
  const isShopifyOAuth = pathname.startsWith('/shopify/');
  const isShopifyApi = pathname.startsWith('/api/shopify/');
  const isMcpApi = pathname.startsWith('/api/mcp') || pathname.startsWith('/api/mcpServer');
  const isPayPage = pathname.startsWith('/pay/');
  const isImageProxyApi = pathname.startsWith('/api/image-proxy');
  const isWidgetApi = pathname.startsWith('/widget/');
  const isShopifyWebhookApi = pathname.startsWith('/api/shopify/webhooks');
  const isPrivacyPolicyApi = pathname.startsWith('/privacy-policy');
  const isPublicBountyHuntArticle =
    pathname.startsWith('/geo/bounty/') && pathname.endsWith('/hunt');

  const isPublic =
    isLoginPage ||
    isDevLoginPage ||
    isLandingPage ||
    isAuthApi ||
    isCronApi ||
    isVideosDownloadApi ||
    isMicroservicesApi ||
    isDataMineApi ||
    isShopifyOAuth ||
    isShopifyApi ||
    isMcpApi ||
    isPayPage ||
    isImageProxyApi ||
    isShopifyWebhookApi ||
    isPrivacyPolicyApi ||
    isWidgetApi ||
    isPublicBountyHuntArticle;

  if (isPublic) {
    if ((isLoginPage || isDevLoginPage) && hasValidAuthCookie(request)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!hasValidAuthCookie(request)) {
    const landingUrl = new URL('/landing', request.url);
    landingUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

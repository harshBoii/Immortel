'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * After OAuth callback (or embedded auth) we land on /?shopify_connected=1.
 * Refetches app context so the sidebar shows the store as connected without a full reload.
 */
export function ShopifyOAuthReturnSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (searchParams.get('shopify_connected') !== '1') return;
    ran.current = true;

    window.dispatchEvent(new Event('immortel:refetch-context'));

    const url = new URL(window.location.href);
    url.searchParams.delete('shopify_connected');
    const next = url.pathname + (url.search ? `${url.search}` : '') + url.hash;
    router.replace(next, { scroll: false });
  }, [router, searchParams]);

  return null;
}

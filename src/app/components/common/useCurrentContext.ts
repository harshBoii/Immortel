'use client';

import { useEffect, useState } from 'react';

type CompanySummary = {
  id: string;
  name: string;
  email: string;
};

type ShopifySummary = {
  id: string;
  shopDomain: string;
  status: string;
};

type WordPressIntegrationSummary = {
  tenantId: string;
  siteUrl: string;
  siteTitle: string | null;
  authUrl: string;
  userLogin: string;
  status: string;
  connectedAt: string;
};

type AppContextState = {
  loading: boolean;
  error: string | null;
  company: CompanySummary | null;
  shopify: ShopifySummary | null;
  shopifyConnectUrl: string | null;
  /** Normalized *.myshopify.com saved for credential resolution before install */
  expectedShopDomain: string | null;
  wordpressIntegration: WordPressIntegrationSummary | null;
  refetch: () => void;
};

export function useCurrentContext(): AppContextState {
  const [state, setState] = useState<Omit<AppContextState, 'refetch'>>({
    loading: true,
    error: null,
    company: null,
    shopify: null,
    shopifyConnectUrl: null,
    expectedShopDomain: null,
    wordpressIntegration: null,
  });
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/app-context', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: data?.error ?? 'Failed to load context',
            }));
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            company: data.company ?? null,
            shopify: data.shopify ?? null,
            shopifyConnectUrl: data.shopifyConnectUrl ?? null,
            expectedShopDomain: data.expectedShopDomain ?? null,
            wordpressIntegration: data.wordpressIntegration ?? null,
          });
        }
      } catch (err) {
        console.error('Failed to load app context', err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to load context',
          }));
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  useEffect(() => {
    const handler = () => setFetchKey((k) => k + 1);
    window.addEventListener('immortel:refetch-context', handler);
    return () => window.removeEventListener('immortel:refetch-context', handler);
  }, []);

  return {
    ...state,
    refetch: () => setFetchKey((k) => k + 1),
  };
}


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

type AppContextState = {
  loading: boolean;
  error: string | null;
  company: CompanySummary | null;
  shopify: ShopifySummary | null;
  refetch: () => void;
};

export function useCurrentContext(): AppContextState {
  const [state, setState] = useState<Omit<AppContextState, 'refetch'>>({
    loading: true,
    error: null,
    company: null,
    shopify: null,
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

  return {
    ...state,
    refetch: () => setFetchKey((k) => k + 1),
  };
}


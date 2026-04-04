'use client';

import { useEffect, useState } from 'react';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import { ShopProductsStats } from '@/app/components/shop/ShopProductsStats';
import { ShopProductsCharts } from '@/app/components/shop/ShopProductsCharts';
import { ShopProductsTable } from '@/app/components/shop/ShopProductsTable';

type ProductNode = {
  id: string;
  shopifyGid: string;
  title: string;
  status: string;
  handle: string;
  totalInventory: number;
  onlineStoreUrl: string | null;
  priceMinAmount: string | null;
  priceMaxAmount: string | null;
  currencyCode: string | null;
  shopifyCreatedAt: string;
  shopifyUpdatedAt: string;
  featuredImageUrl?: string | null;
  featuredImageAltText?: string | null;
  description?: string | null;
};

type ApiResponse =
  | {
      success: true;
      data: ProductNode[];
    }
  | {
      success: false;
      error: string;
    };

export default function WooCommerceProductsPage() {
  const { company } = useCurrentContext();
  const [products, setProducts] = useState<ProductNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/shop/woocommerce-products', {
          credentials: 'include',
        });
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success) {
          const message =
            (!res.ok && 'Failed to load products') ||
            ('error' in json && json.error) ||
            'Failed to load products';
          if (!cancelled) setError(message);
          return;
        }

        if (!cancelled) {
          setProducts(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch WooCommerce products', err);
        if (!cancelled) setError('Failed to fetch WooCommerce products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/woocommerce-products/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to sync products from WooCommerce');
        return;
      }
      const reload = await fetch('/api/shop/woocommerce-products', {
        credentials: 'include',
      });
      const data = (await reload.json()) as ApiResponse;
      if (!reload.ok || !data.success) {
        setError(
          !data.success && 'error' in data ? data.error : 'Synced but failed to reload list'
        );
        return;
      }
      setProducts(data.data);
    } catch (err) {
      console.error('WooCommerce sync failed', err);
      setError('Failed to sync products');
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const companyName = company?.name?.trim();

    if (!query) {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch('/api/shop/woocommerce-products', {
          credentials: 'include',
        });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || !json.success) {
          setError(!json.success && 'error' in json ? json.error : 'Failed to load products');
          return;
        }
        setProducts(json.data);
      } catch {
        setError('Failed to load products');
      } finally {
        setSearching(false);
      }
      return;
    }

    if (!companyName) {
      setError('Company context not loaded yet. Refresh the page.');
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/mcp/products/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query,
          companyName,
          page: 1,
          pageSize: 100,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Failed to search products');
        return;
      }

      setProducts(json.data as ProductNode[]);
    } catch (err) {
      console.error('Failed to search products', err);
      setError('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
            Shop Intel · WooCommerce products
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Catalog synced from your connected WooCommerce store. Save to the database and index for
            MCP product search.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search (Elasticsearch, e.g. "shirt under 50")'
              className="px-3 py-2 rounded-lg text-xs bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] min-w-[260px]"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--sibling-primary)]/90 hover:bg-[var(--sibling-primary)] text-white transition-colors disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)]/80 text-foreground transition-colors disabled:opacity-50"
          >
            {syncing ? 'Saving & indexing…' : 'Save all from WooCommerce'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Loading WooCommerce products from the database…
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          No WooCommerce products in the database yet. Connect a store under Connection → WooCommerce,
          then click <strong>Save all from WooCommerce</strong>.
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-6 items-start">
          <div>
            <ShopProductsTable products={products} />
          </div>
          <div className="space-y-3">
            <ShopProductsCharts products={products} />
            <ShopProductsStats products={products} />
          </div>
        </div>
      )}
    </div>
  );
}

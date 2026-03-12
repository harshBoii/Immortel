'use client';

import { useEffect, useState } from 'react';
import { ShopProductsStats } from '@/app/components/shop/ShopProductsStats';
import { ShopProductsCharts } from '@/app/components/shop/ShopProductsCharts';
import { ShopProductsTable } from '@/app/components/shop/ShopProductsTable';

type ProductNode = {
  id: string;
  title: string;
  status: string;
  handle: string;
  totalInventory: number;
  onlineStoreUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse =
  | {
      success: true;
      data: {
        data?: {
          products?: {
            edges?: { node: ProductNode }[];
          };
        };
      };
    }
  | {
      success: false;
      error: string;
    };

export default function ShopProductsPage() {
  const [products, setProducts] = useState<ProductNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/shopify/product', { credentials: 'include' });
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success) {
          const message = (!res.ok && 'Failed to load products') || ('error' in json && json.error) || 'Failed to load products';
          if (!cancelled) setError(message);
          return;
        }

        const edges = json.data?.data?.products?.edges ?? [];
        const nodes = edges.map((e) => e.node);
        if (!cancelled) {
          setProducts(nodes);
        }
      } catch (err) {
        console.error('Failed to fetch Shopify products', err);
        if (!cancelled) setError('Failed to fetch Shopify products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
            Shop Intel · Products
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Live snapshot of your connected Shopify catalog, with product status and inventory insights.
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Loading products from Shopify…
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          No products found in your connected Shopify store yet.
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


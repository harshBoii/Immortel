'use client';

import { useState } from 'react';

type ProductNode = {
  id: string;
  title: string;
  status: string;
  handle: string;
  totalInventory: number;
  onlineStoreUrl: string | null;
  featuredImageUrl?: string | null;
  featuredImageAltText?: string | null;
  priceMinAmount: string | null;
  priceMaxAmount: string | null;
  currencyCode: string | null;
  shopifyCreatedAt: string;
  shopifyUpdatedAt: string;
  description?: string | null;
};

type Props = {
  products: ProductNode[];
};

const statusBadgeClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  DRAFT: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ARCHIVED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export function ShopProductsTable({ products }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<ProductNode | null>(null);

  const closeModal = () => setSelectedProduct(null);

  return (
    <>
      <div className="mt-6 glass-card rounded-xl border border-[var(--glass-border)] overflow-hidden h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--glass-border)] flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground font-heading">
            Products
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Showing {products.length} products
          </span>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="min-w-full text-sm">
          <thead className="bg-[var(--glass-hover)]/40 text-xs uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
            <tr>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Price</Th>
              <Th>Inventory</Th>
              <Th>Created</Th>
              <Th>Updated</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const statusClass =
                statusBadgeClasses[p.status] ?? 'bg-[var(--glass-hover)] text-foreground border-transparent';
              const isOutOfStock = p.status === 'ACTIVE' && (p.totalInventory ?? 0) === 0;

              const currency = p.currencyCode ?? '';
              const priceMin = p.priceMinAmount ? parseFloat(p.priceMinAmount) : null;
              const priceMax = p.priceMaxAmount ? parseFloat(p.priceMaxAmount) : null;
              const priceDisplay =
                priceMin != null && priceMax != null
                  ? priceMin === priceMax
                    ? `${currency} ${priceMin.toFixed(2)}`
                    : `${currency} ${priceMin.toFixed(2)} – ${priceMax.toFixed(2)}`
                  : '—';

              return (
                <tr
                  key={p.id}
                  className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]/60 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.featuredImageUrl && (
                        <div className="h-10 w-10 rounded-md overflow-hidden border border-[var(--glass-border)] flex-shrink-0 bg-[var(--glass-hover)]">
                          <img
                            src={p.featuredImageUrl}
                            alt={p.featuredImageAltText ?? p.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-2">
                          {p.title}
                        </span>
                        {p.onlineStoreUrl && (
                          <a
                            href={p.onlineStoreUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[var(--sibling-primary)] hover:underline"
                          >
                            View in store
                          </a>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusClass}`}
                    >
                      {p.status.toLowerCase()}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-medium text-foreground text-sm">
                      {priceDisplay}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={
                        isOutOfStock
                          ? 'text-destructive font-semibold'
                          : 'text-foreground font-medium'
                      }
                    >
                      {p.totalInventory}
                    </span>
                  </Td>
                  <Td>{new Date(p.shopifyCreatedAt).toLocaleDateString()}</Td>
                  <Td>{new Date(p.shopifyUpdatedAt).toLocaleDateString()}</Td>
                  <Td>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md text-[11px] font-medium border border-[var(--glass-border)] bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)]/80 text-foreground transition-colors"
                      onClick={() => setSelectedProduct(p)}
                    >
                      View more
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={closeModal} />
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left font-semibold border-b border-[var(--glass-border)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 align-top">{children}</td>;
}

function ProductDetailModal({
  product,
  onClose,
}: {
  product: ProductNode;
  onClose: () => void;
}) {
  const currency = product.currencyCode ?? '';
  const priceMin = product.priceMinAmount ? parseFloat(product.priceMinAmount) : null;
  const priceMax = product.priceMaxAmount ? parseFloat(product.priceMaxAmount) : null;
  const priceDisplay =
    priceMin != null && priceMax != null
      ? priceMin === priceMax
        ? `${currency} ${priceMin.toFixed(2)}`
        : `${currency} ${priceMin.toFixed(2)} – ${priceMax.toFixed(2)}`
      : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl mx-4 glass-card rounded-2xl border border-[var(--glass-border)] bg-background/95 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--glass-border)]">
          <h2 className="text-sm font-semibold text-foreground font-heading">
            Product details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-start gap-4">
            {product.featuredImageUrl && (
              <div className="h-20 w-20 rounded-lg overflow-hidden border border-[var(--glass-border)] flex-shrink-0 bg-[var(--glass-hover)]">
                <img
                  src={product.featuredImageUrl}
                  alt={product.featuredImageAltText ?? product.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {product.title}
              </h3>
              <p className="text-xs text-muted-foreground break-all">
                Handle: {product.handle}
              </p>
              <p className="text-xs text-muted-foreground">
                Status:{' '}
                <span className="font-medium text-foreground">
                  {product.status.toLowerCase()}
                </span>
              </p>
            </div>
          </div>

          {product.description && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Description
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Price
              </p>
              <p className="text-sm font-medium text-foreground">{priceDisplay}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Inventory
              </p>
              <p className="text-sm font-medium text-foreground">
                {product.totalInventory}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Created
              </p>
              <p className="text-sm text-foreground">
                {new Date(product.shopifyCreatedAt).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Updated
              </p>
              <p className="text-sm text-foreground">
                {new Date(product.shopifyUpdatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {product.onlineStoreUrl && (
            <div className="pt-1">
              <a
                href={product.onlineStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)]/80 text-[var(--sibling-primary)] transition-colors"
              >
                View product in store
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



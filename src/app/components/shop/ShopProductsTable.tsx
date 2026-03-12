'use client';

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

type Props = {
  products: ProductNode[];
};

const statusBadgeClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  DRAFT: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ARCHIVED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export function ShopProductsTable({ products }: Props) {
  return (
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
              <Th>Inventory</Th>
              <Th>Handle</Th>
              <Th>Created</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const statusClass =
                statusBadgeClasses[p.status] ?? 'bg-[var(--glass-hover)] text-foreground border-transparent';
              const isOutOfStock = p.status === 'ACTIVE' && (p.totalInventory ?? 0) === 0;

              return (
                <tr
                  key={p.id}
                  className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]/60 transition-colors"
                >
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{p.title}</span>
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
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusClass}`}
                    >
                      {p.status.toLowerCase()}
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
                  <Td>
                    <code className="text-[11px] bg-[var(--glass-hover)] px-2 py-0.5 rounded-md">
                      {p.handle}
                    </code>
                  </Td>
                  <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                  <Td>{new Date(p.updatedAt).toLocaleDateString()}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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


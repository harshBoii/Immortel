'use client';

type ProductNode = {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
};

type Props = {
  products: ProductNode[];
};

export function ShopProductsStats({ products }: Props) {
  const total = products.length;
  const byStatus = products.reduce(
    (acc, p) => {
      const key = p.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const active = byStatus.active ?? 0;
  const draft = byStatus.draft ?? 0;
  const archived = byStatus.archived ?? 0;

  const totalInventory = products.reduce((sum, p) => sum + (p.totalInventory ?? 0), 0);
  const outOfStock = products.filter(
    (p) => p.status === 'ACTIVE' && (p.totalInventory ?? 0) === 0
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      <StatCard label="Total products" value={total} />
      <StatCard label="Active" value={active} />
      <StatCard label="Draft" value={draft} />
      <StatCard label="Archived" value={archived} />
      <StatCard label="Total inventory" value={totalInventory} />
      <StatCard label="Out of stock" value={outOfStock} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card px-4 py-3 rounded-xl border border-[var(--glass-border)]">
      <div className="text-[11px] uppercase tracking-wide text-[var(--sibling-accent)] mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}


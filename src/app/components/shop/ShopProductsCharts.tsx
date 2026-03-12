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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e', // emerald-500
  DRAFT: '#facc15', // yellow-400
  ARCHIVED: '#64748b', // slate-500
};

export function ShopProductsCharts({ products }: Props) {
  const total = products.length || 1;
  const counts = products.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const segments = (['ACTIVE', 'DRAFT', 'ARCHIVED'] as const)
    .map((status) => ({
      status,
      count: counts[status] ?? 0,
    }))
    .filter((s) => s.count > 0);

  let currentAngle = 0;
  const radius = 16;
  const center = 20;

  const paths = segments.map((seg) => {
    const percentage = seg.count / total;
    const angle = percentage * 2 * Math.PI;
    const x1 = center + radius * Math.cos(currentAngle);
    const y1 = center + radius * Math.sin(currentAngle);
    const x2 = center + radius * Math.cos(currentAngle + angle);
    const y2 = center + radius * Math.sin(currentAngle + angle);
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    const d = `
      M ${center} ${center}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `;
    currentAngle += angle;
    return {
      d,
      status: seg.status,
      count: seg.count,
      color: STATUS_COLORS[seg.status] ?? '#6b7280',
    };
  });

  const totalInventory = products.reduce(
    (sum, p) => sum + (p.totalInventory ?? 0),
    0
  );
  const outOfStock = products.filter(
    (p) => p.status === 'ACTIVE' && (p.totalInventory ?? 0) === 0
  ).length;

  return (
    <div className="glass-card rounded-xl border border-[var(--glass-border)] p-4">
      <h2 className="text-sm font-semibold text-foreground font-heading">
        Product distribution
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Breakdown of products by status with inventory highlights.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg
            viewBox="0 0 40 40"
            className="w-full h-full drop-shadow-sm"
          >
            {paths.map((p, idx) => (
              <path
                key={p.status + idx}
                d={p.d}
                fill={p.color}
                stroke="#020617"
                strokeWidth="0.2"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold text-foreground">
                {total}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((status) => {
            const count = counts[status] ?? 0;
            if (count === 0) return null;
            const color = STATUS_COLORS[status] ?? '#6b7280';
            const percentage = ((count / total) * 100).toFixed(0);
            const label = status === 'ACTIVE'
              ? 'Active'
              : status === 'DRAFT'
              ? 'Draft'
              : 'Archived';

            return (
              <div key={status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{count}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="glass-card px-3 py-2 rounded-lg border border-[var(--glass-border)]">
          <div className="text-[10px] uppercase tracking-wide text-[var(--sibling-accent)] mb-0.5">
            Total inventory
          </div>
          <div className="text-sm font-semibold text-foreground">
            {totalInventory}
          </div>
        </div>
        <div className="glass-card px-3 py-2 rounded-lg border border-[var(--glass-border)]">
          <div className="text-[10px] uppercase tracking-wide text-[var(--sibling-accent)] mb-0.5">
            Out of stock
          </div>
          <div className="text-sm font-semibold text-destructive">
            {outOfStock}
          </div>
        </div>
      </div>
    </div>
  );
}


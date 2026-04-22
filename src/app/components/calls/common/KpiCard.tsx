import React from 'react';

export type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
  };
  icon?: React.ComponentType<{ className?: string }>;
};

export function KpiCard({ label, value, hint, trend, icon: Icon }: KpiCardProps) {
  return (
    <div className="glass-card flex flex-col gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/70 px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 leading-none">
          {label}
        </span>
        {Icon && (
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--glass-hover)] border border-[var(--glass-border)]/60">
            <Icon className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-foreground leading-tight">{value}</span>
        {trend && (
          <span
            className={`text-[11px] font-medium leading-none ${
              trend.direction === 'up'
                ? 'text-emerald-500'
                : trend.direction === 'down'
                  ? 'text-rose-500'
                  : 'text-muted-foreground/60'
            }`}
          >
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'} {trend.value}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground/60 leading-tight">{hint}</span>}
    </div>
  );
}

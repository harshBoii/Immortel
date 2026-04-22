import React from 'react';
import { KpiCard, type KpiCardProps } from './KpiCard';

export function KpiRow({ items }: { items: KpiCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item, idx) => (
        <KpiCard key={`${item.label}-${idx}`} {...item} />
      ))}
    </div>
  );
}

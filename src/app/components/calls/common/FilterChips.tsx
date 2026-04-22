'use client';

import React from 'react';

export type FilterChip = {
  id: string;
  label: string;
  count?: number;
};

export type FilterChipsProps = {
  chips: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
};

export function FilterChips({ chips, activeId, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
              active
                ? 'border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
                : 'border-[var(--glass-border)] bg-[var(--glass)]/60 text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
            }`}
          >
            {c.label}
            {typeof c.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  active ? 'bg-[var(--sibling-primary)]/20' : 'bg-[var(--glass-hover)]'
                }`}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

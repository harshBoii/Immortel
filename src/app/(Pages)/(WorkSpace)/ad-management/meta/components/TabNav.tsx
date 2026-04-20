'use client';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'creatives', label: 'Creatives' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'adsets', label: 'Ad Sets' },
  { id: 'adcreatives', label: 'Ad Creatives' },
  { id: 'ads', label: 'Ads' },
] as const;

export type MetaTabId = (typeof TABS)[number]['id'];

export function TabNav({
  active,
  onChange,
}: {
  active: MetaTabId;
  onChange: (id: MetaTabId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--glass-border)] pb-2 mb-6">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === t.id
              ? 'bg-[var(--sibling-primary)]/12 text-[var(--sibling-primary)]'
              : 'text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

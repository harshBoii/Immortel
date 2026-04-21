'use client';

import { useCallback, useEffect, useState } from 'react';
import { ViewMoreDropdown } from '@/app/components/common/UI/ViewMoreDropdown';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

const OBJECTIVES = [
  'OUTCOME_TRAFFIC',
  'OUTCOME_SALES',
  'OUTCOME_LEADS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_AWARENESS',
] as const;

const SPECIAL = ['NONE', 'HOUSING', 'CREDIT', 'EMPLOYMENT'] as const;

type Campaign = {
  id: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number;
  metaCampaignId: string;
};

export function CampaignsTab() {
  const { meta } = useCurrentContext();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState<string>(OBJECTIVES[0]!);
  const [dailyPaise, setDailyPaise] = useState('');
  const [special, setSpecial] = useState<string[]>(['NONE']);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/campaigns', { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Failed to load');
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (meta) void load();
    else setLoading(false);
  }, [meta, load]);

  const toggleSpecial = (code: string) => {
    setSpecial((prev) => {
      if (code === 'NONE') return ['NONE'];
      const withoutNone = prev.filter((x) => x !== 'NONE');
      if (withoutNone.includes(code)) return withoutNone.filter((x) => x !== code).length ? withoutNone.filter((x) => x !== code) : ['NONE'];
      return [...withoutNone, code];
    });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const dailyBudgetPaise = dailyPaise ? parseInt(dailyPaise, 10) : 0;
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objective,
          dailyBudgetPaise: Number.isFinite(dailyBudgetPaise) ? dailyBudgetPaise : 0,
          specialAdCategories: special.includes('NONE') ? [] : special,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Create failed');
        return;
      }
      setName('');
      setDailyPaise('');
      await load();
    } catch {
      setError('Create failed');
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/campaigns/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Sync failed');
        return;
      }
      await load();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (!meta) return null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={create} className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-4">
            <h3 className="text-sm font-semibold">New campaign</h3>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Objective</span>
              <ViewMoreDropdown tooltipContent="Objective" align="left">
                {(close) => (
                  <div className="py-1 max-h-56 overflow-auto">
                    {OBJECTIVES.map((o) => (
                      <button
                        key={o}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                        onClick={() => {
                          setObjective(o);
                          close();
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </ViewMoreDropdown>
              <p className="text-xs text-muted-foreground/80">{objective}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Daily budget (paise, 0 = use ad set)</label>
              <input
                value={dailyPaise}
                onChange={(e) => setDailyPaise(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Special ad categories</span>
              <div className="flex flex-wrap gap-2">
                {SPECIAL.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={special.includes(s)} onChange={() => toggleSpecial(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create (PAUSED)'}
            </button>
          </form>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border)] px-3 py-2">
            <h3 className="text-sm font-semibold">Your campaigns</h3>
            <button
              type="button"
              onClick={() => void sync()}
              disabled={syncing}
              className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync from Meta'}
            </button>
          </div>

          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-[var(--glass-border)] bg-[var(--glass)]/70 backdrop-blur">
                    <tr>
                      <th className="p-2 font-medium">Name</th>
                      <th className="p-2 font-medium">Objective</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Daily (paise)</th>
                      <th className="p-2 font-medium">Meta ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id} className="border-b border-[var(--glass-border)]/60">
                        <td className="p-2">{c.name}</td>
                        <td className="p-2 font-mono">{c.objective}</td>
                        <td className="p-2">{c.status}</td>
                        <td className="p-2">{c.dailyBudget}</td>
                        <td className="p-2 font-mono text-[10px]">{c.metaCampaignId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

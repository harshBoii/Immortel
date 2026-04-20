'use client';

import { useCallback, useEffect, useState } from 'react';
import { ViewMoreDropdown } from '@/app/components/common/UI/ViewMoreDropdown';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

type Campaign = { id: string; name: string; metaCampaignId: string };
type AdSet = {
  id: string;
  name: string | null;
  metaAdSetId: string;
  status: string | null;
  dailyBudget: number | null;
  campaign: { name: string; metaCampaignId: string };
};

export function AdSetsTab() {
  const { meta } = useCurrentContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaignDbId, setCampaignDbId] = useState('');
  const [name, setName] = useState('');
  const [dailyPaise, setDailyPaise] = useState('50000');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rc, ra] = await Promise.all([
        fetch('/api/meta/campaigns', { credentials: 'include' }),
        fetch('/api/meta/adsets', { credentials: 'include' }),
      ]);
      const jc = await rc.json().catch(() => ({}));
      const ja = await ra.json().catch(() => ({}));
      if (!rc.ok) setError(typeof jc.error === 'string' ? jc.error : 'Failed to load campaigns');
      else setCampaigns(Array.isArray(jc.items) ? jc.items : []);
      if (ra.ok) setItems(Array.isArray(ja.items) ? ja.items : []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (meta) void load();
    else setLoading(false);
  }, [meta, load]);

  useEffect(() => {
    if (campaigns.length && !campaignDbId) {
      setCampaignDbId(campaigns[0]!.id);
    }
  }, [campaigns, campaignDbId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignDbId) return;
    setSaving(true);
    setError(null);
    try {
      const dailyBudgetPaise = dailyPaise ? parseInt(dailyPaise, 10) : 0;
      const res = await fetch('/api/meta/adsets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignDbId,
          name,
          dailyBudgetPaise: Number.isFinite(dailyBudgetPaise) ? dailyBudgetPaise : 0,
          optimizationGoal: 'LINK_CLICKS',
          billingEvent: 'IMPRESSIONS',
          bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
          targeting: {
            geo_locations: { countries: ['IN'] },
            age_min: 18,
            age_max: 45,
            publisher_platforms: ['facebook', 'instagram'],
            facebook_positions: ['feed'],
            instagram_positions: ['stream', 'story'],
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Create failed');
        return;
      }
      setName('');
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
      const res = await fetch('/api/meta/adsets/sync', { method: 'POST', credentials: 'include' });
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
    <div className="space-y-6">
      <form onSubmit={create} className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-4 max-w-xl">
        <h3 className="text-sm font-semibold">New ad set</h3>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Campaign</span>
          <ViewMoreDropdown tooltipContent="Campaign" align="left">
            {(close) => (
              <div className="py-1 max-h-56 overflow-auto">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                    onClick={() => {
                      setCampaignDbId(c.id);
                      close();
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </ViewMoreDropdown>
          <p className="text-xs text-muted-foreground truncate">
            {campaigns.find((c) => c.id === campaignDbId)?.name ?? '—'}
          </p>
        </div>
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
          <label className="text-xs text-muted-foreground">Daily budget (paise)</label>
          <input
            value={dailyPaise}
            onChange={(e) => setDailyPaise(e.target.value.replace(/[^\d]/g, ''))}
            className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Targeting defaults: India, ages 18–45, Facebook + Instagram feed &amp; story placements.
        </p>
        <button
          type="submit"
          disabled={saving || !campaignDbId}
          className="rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create ad set (PAUSED)'}
        </button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ad sets</h3>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync from Meta'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--glass-border)] bg-[var(--glass)]/50">
              <tr>
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium">Campaign</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Daily</th>
                <th className="p-2 font-medium">Meta ad set ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-[var(--glass-border)]/60">
                  <td className="p-2">{a.name ?? '—'}</td>
                  <td className="p-2">{a.campaign.name}</td>
                  <td className="p-2">{a.status ?? '—'}</td>
                  <td className="p-2">{a.dailyBudget ?? '—'}</td>
                  <td className="p-2 font-mono text-[10px]">{a.metaAdSetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

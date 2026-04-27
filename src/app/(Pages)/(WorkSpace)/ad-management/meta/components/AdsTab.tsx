'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ViewMoreDropdown } from '@/app/components/common/UI/ViewMoreDropdown';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

type AdSetOpt = { id: string; name: string | null; metaAdSetId: string };
type CrOpt = { id: string; headline: string; metaCreativeId: string | null };
type AdRow = {
  id: string;
  metaAdId: string;
  name: string | null;
  status: string | null;
  adSet: { name: string | null };
  creative: { headline: string } | null;
};

type SyncFilter = 'all' | 'synced' | 'not_synced';
type SortKey = 'name' | 'adset' | 'creative' | 'status' | 'metaId';
type SortDir = 'asc' | 'desc';

export function AdsTab() {
  const { meta } = useCurrentContext();
  const [adSets, setAdSets] = useState<AdSetOpt[]>([]);
  const [creatives, setCreatives] = useState<CrOpt[]>([]);
  const [items, setItems] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAfter, setNextAfter] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastBatch, setLastBatch] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [adSetId, setAdSetId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rs, rc, ra] = await Promise.all([
        fetch('/api/meta/adsets', { credentials: 'include' }),
        fetch('/api/meta/adcreatives', { credentials: 'include' }),
        fetch('/api/meta/ads', { credentials: 'include' }),
      ]);
      const js = await rs.json().catch(() => ({}));
      const jc = await rc.json().catch(() => ({}));
      const ja = await ra.json().catch(() => ({}));
      if (rs.ok) {
        const list = (Array.isArray(js.items) ? js.items : []) as AdSetOpt[];
        setAdSets(list);
      }
      if (rc.ok) {
        const cr = (Array.isArray(jc.items) ? jc.items : []) as CrOpt[];
        setCreatives(cr.filter((c) => c.metaCreativeId));
      }
      if (ra.ok) setItems(Array.isArray(ja.items) ? ja.items : []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adSets.length && !adSetId) setAdSetId(adSets[0]!.id);
  }, [adSets, adSetId]);

  useEffect(() => {
    if (creatives.length && !creativeId) {
      const first = creatives.find((c) => c.metaCreativeId);
      if (first) setCreativeId(first.id);
    }
  }, [creatives, creativeId]);

  useEffect(() => {
    if (meta) void load();
    else setLoading(false);
  }, [meta, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/ads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adSetDbId: adSetId,
          creativeDbId: creativeId,
          name: name || 'Ad',
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
      const res = await fetch('/api/meta/ads/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ after: nextAfter ?? undefined, limit: 10 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Sync failed');
        return;
      }
      setNextAfter(typeof j.nextAfter === 'string' ? j.nextAfter : null);
      setHasMore(Boolean(j.hasMore));
      setLastBatch(typeof j.synced === 'number' ? j.synced : null);
      await load();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const activate = async (metaAdId: string) => {
    setActivating(metaAdId);
    setError(null);
    try {
      const res = await fetch(`/api/meta/ads/${encodeURIComponent(metaAdId)}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Activate failed');
        return;
      }
      await load();
    } catch {
      setError('Activate failed');
    } finally {
      setActivating(null);
    }
  };

  if (!meta) return null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.slice();

    if (syncFilter !== 'all') {
      list = list.filter((a) => {
        const isSynced = Boolean(a.creative);
        return syncFilter === 'synced' ? isSynced : !isSynced;
      });
    }

    if (q.length > 0) {
      list = list.filter((a) => {
        const hay = [
          a.name ?? '',
          a.metaAdId ?? '',
          a.status ?? '',
          a.adSet?.name ?? '',
          a.creative?.headline ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const keyFor = (a: AdRow): string => {
      switch (sortKey) {
        case 'name':
          return a.name ?? '';
        case 'adset':
          return a.adSet?.name ?? '';
        case 'creative':
          return a.creative?.headline ?? '';
        case 'status':
          return a.status ?? '';
        case 'metaId':
          return a.metaAdId ?? '';
        default:
          return a.name ?? '';
      }
    };

    list.sort((a, b) => {
      const ka = keyFor(a);
      const kb = keyFor(b);
      return ka.localeCompare(kb, undefined, { sensitivity: 'base' }) * dir;
    });

    return list;
  }, [items, query, sortKey, sortDir, syncFilter]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={create} className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-4">
            <h3 className="text-sm font-semibold">New ad</h3>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Ad set</span>
              <ViewMoreDropdown tooltipContent="Ad set" align="left">
                {(close) => (
                  <div className="py-1 max-h-56 overflow-auto">
                    {adSets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                        onClick={() => {
                          setAdSetId(a.id);
                          close();
                        }}
                      >
                        {a.name ?? a.metaAdSetId}
                      </button>
                    ))}
                  </div>
                )}
              </ViewMoreDropdown>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Creative</span>
              <ViewMoreDropdown tooltipContent="Creative" align="left">
                {(close) => (
                  <div className="py-1 max-h-56 overflow-auto">
                    {creatives.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                        onClick={() => {
                          setCreativeId(c.id);
                          close();
                        }}
                      >
                        {c.headline}
                      </button>
                    ))}
                  </div>
                )}
              </ViewMoreDropdown>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
                placeholder="Ad name"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !adSetId || !creativeId}
              className="rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create ad (PAUSED)'}
            </button>
          </form>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border)] px-3 py-2">
            <h3 className="text-sm font-semibold">Ads</h3>
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-40 rounded-lg border border-[var(--glass-border)] bg-background px-2 text-xs"
              />
              <select
                value={syncFilter}
                onChange={(e) => setSyncFilter(e.target.value as SyncFilter)}
                className="h-8 rounded-lg border border-[var(--glass-border)] bg-background px-2 text-xs"
              >
                <option value="all">All</option>
                <option value="synced">Synced</option>
                <option value="not_synced">Not synced</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-8 rounded-lg border border-[var(--glass-border)] bg-background px-2 text-xs"
              >
                <option value="name">Sort: Name</option>
                <option value="adset">Sort: Ad set</option>
                <option value="creative">Sort: Creative</option>
                <option value="status">Sort: Status</option>
                <option value="metaId">Sort: Meta ID</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="h-8 rounded-lg border border-[var(--glass-border)] px-2 text-xs font-medium hover:bg-[var(--glass-hover)]"
              >
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
              <button
                type="button"
                onClick={() => void sync()}
                disabled={syncing}
                className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : hasMore || nextAfter ? 'Sync next 10' : 'Sync 10 from Meta'}
              </button>
            </div>
          </div>
          {(lastBatch != null || hasMore || nextAfter) && (
            <div className="border-b border-[var(--glass-border)] px-3 py-2 text-[10px] text-muted-foreground">
              {lastBatch != null ? <>Last batch synced: {lastBatch}. </> : null}
              {hasMore ? 'More ads available on Meta.' : 'No more Meta pages (or end reached).'}
            </div>
          )}

          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-[var(--glass-border)] bg-[var(--glass)]/70 backdrop-blur">
                    <tr>
                      <th className="p-2 font-medium">Name</th>
                      <th className="p-2 font-medium">Ad set</th>
                      <th className="p-2 font-medium">Creative</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Sync</th>
                      <th className="p-2 font-medium">Meta ID</th>
                      <th className="p-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-b border-[var(--glass-border)]/60">
                        <td className="p-2">
                          <Link
                            href={`/ad-management/meta/ads/${encodeURIComponent(a.metaAdId)}`}
                            className="font-medium text-[var(--sibling-primary)] hover:underline underline-offset-2"
                          >
                            {a.name ?? '—'}
                          </Link>
                        </td>
                        <td className="p-2">{a.adSet.name ?? '—'}</td>
                        <td className="p-2">{a.creative?.headline ?? '—'}</td>
                        <td className="p-2">{a.status ?? '—'}</td>
                        <td className="p-2">
                          <span
                            className={
                              a.creative
                                ? 'rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300'
                                : 'rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200'
                            }
                          >
                            {a.creative ? 'Synced' : 'Not synced'}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-[10px]">{a.metaAdId}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => void activate(a.metaAdId)}
                            disabled={activating === a.metaAdId}
                            className="rounded border border-[var(--glass-border)] px-2 py-1 text-[10px] font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
                          >
                            {activating === a.metaAdId ? '…' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-3 text-sm text-muted-foreground">
                          No ads match your filters.
                        </td>
                      </tr>
                    )}
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

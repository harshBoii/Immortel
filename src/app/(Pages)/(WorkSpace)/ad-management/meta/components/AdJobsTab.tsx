'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type JobRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  heygenStatus: string;
  progressMessage: string | null;
  heygenVideoId: string | null;
  assetId: string | null;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
};

type JobsResponse = { ok?: boolean; error?: string; items?: JobRow[] };

function statusBadge(status: string) {
  const s = (status || 'unknown').toLowerCase();
  const style =
    s === 'completed'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : s === 'failed' || s === 'error'
        ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
        : 'border-[var(--glass-border)] bg-[var(--glass)]/20 text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}

export function AdJobsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<JobRow[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/heygen/jobs', { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as JobsResponse;
      if (!res.ok || !json?.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Failed to load jobs');
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshOne = async (jobId: string) => {
    setRefreshingId(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/meta/heygen/jobs/${encodeURIComponent(jobId)}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Refresh failed');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshingId(null);
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Generated ad jobs</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            List of HeyGen generation jobs. Use refresh to query `GET /v3/videos/{'{video_id}'}` and update status/URLs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/20 px-3 py-2 text-xs font-semibold hover:bg-[var(--glass-hover)]"
        >
          Refresh list
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--glass-border)] bg-[var(--glass)]/20">
              <tr>
                <th className="p-2 font-medium">Job</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Video ID</th>
                <th className="p-2 font-medium">Updated</th>
                <th className="p-2 font-medium">Download</th>
                <th className="p-2 font-medium">Asset</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-3 text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-sm text-muted-foreground">
                    No jobs yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--glass-border)]/60">
                    <td className="p-2 font-mono text-[10px]">{r.id}</td>
                    <td className="p-2">{statusBadge(r.heygenStatus)}</td>
                    <td className="p-2 font-mono text-[10px]">{r.heygenVideoId ?? '—'}</td>
                    <td className="p-2 text-[10px] text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleString()}
                      {r.progressMessage ? <div className="mt-1">{r.progressMessage}</div> : null}
                    </td>
                    <td className="p-2">
                      {r.downloadUrl ? (
                        <a
                          href={r.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--sibling-primary)] hover:underline underline-offset-2"
                        >
                          Download ↗
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      {r.assetId ? (
                        <Link
                          href={`/ingestion/asset/${encodeURIComponent(r.assetId)}/description`}
                          className="text-[var(--sibling-primary)] hover:underline underline-offset-2"
                        >
                          Open ↗
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => void refreshOne(r.id)}
                        disabled={refreshingId === r.id}
                        className="rounded-lg border border-[var(--glass-border)] px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)] disabled:opacity-50"
                      >
                        {refreshingId === r.id ? 'Refreshing…' : 'Refresh status'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


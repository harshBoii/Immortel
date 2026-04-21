'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

type ProfileJson = {
  meta?: { adAccountId: string; fbPageId: string; lastRefreshed: string | null };
  adAccountName?: string | null;
  pageName?: string | null;
  error?: string;
};

export function ProfileTab() {
  const { meta, refetch } = useCurrentContext();
  const router = useRouter();
  const [data, setData] = useState<ProfileJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/meta/profile', { credentials: 'include' });
        const j = (await res.json()) as ProfileJson;
        if (!cancelled) {
          if (!res.ok) setErr(j.error ?? 'Failed to load profile');
          else setData(j);
        }
      } catch {
        if (!cancelled) setErr('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (meta) void load();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [meta]);

  const disconnect = async () => {
    setDisconnecting(true);
    setErr(null);
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : 'Disconnect failed');
        return;
      }
      refetch();
      router.refresh();
      setData(null);
    } catch {
      setErr('Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!meta) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect Meta on the{' '}
        <Link href="/connection" className="text-[var(--sibling-primary)] font-medium underline-offset-2 hover:underline">
          Connections
        </Link>{' '}
        page first.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {err && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {err}
            </div>
          )}
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4">
            <h3 className="text-sm font-semibold mb-3">Meta connection</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--glass-border)] pb-2">
                <dt className="text-muted-foreground">Ad account</dt>
                <dd className="text-right font-mono text-xs">{data?.meta?.adAccountId}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--glass-border)] pb-2">
                <dt className="text-muted-foreground">Ad account name</dt>
                <dd className="text-right">{data?.adAccountName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--glass-border)] pb-2">
                <dt className="text-muted-foreground">Page</dt>
                <dd className="text-right font-mono text-xs">{data?.meta?.fbPageId}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--glass-border)] pb-2">
                <dt className="text-muted-foreground">Page name</dt>
                <dd className="text-right">{data?.pageName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Last refreshed</dt>
                <dd className="text-right text-xs">
                  {data?.meta?.lastRefreshed ? new Date(data.meta.lastRefreshed).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4 h-fit">
          <h3 className="text-sm font-semibold">Actions</h3>
          <p className="text-xs text-muted-foreground mt-1">Disconnecting will remove the Meta integration from this workspace.</p>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={disconnecting}
            className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect Meta'}
          </button>
        </div>
      </div>
    </div>
  );
}

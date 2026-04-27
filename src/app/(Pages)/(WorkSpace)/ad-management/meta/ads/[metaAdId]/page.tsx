'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { MetaMediaPreview } from '../../components/MetaMediaPreview';

type Creative = {
  id: string;
  metaCreativeId: string | null;
  headline: string;
  primaryText: string;
  description: string | null;
  ctaType: string;
  landingUrl: string;
  imageHash: string | null;
  imageUrl: string | null;
  videoId: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
};

type Ad = {
  id: string;
  metaAdId: string;
  name: string | null;
  status: string | null;
  adSet: { id: string; name: string | null; metaAdSetId: string };
  creative: Creative | null;
};

type Metrics = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
  datePreset: string;
  recordedAt: string;
} | null;

type Live = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
} | null;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function MetaAdDetailPage({
  params,
}: {
  params: Promise<{ metaAdId: string }>;
}) {
  const { metaAdId } = use(params);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingMedia, setFetchingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [metrics, setMetrics] = useState<Metrics>(null);
  const [live, setLive] = useState<Live>(null);

  const fetchData = useCallback(async (opts: { live?: boolean } = {}) => {
    const isLive = Boolean(opts.live);
    if (isLive) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = isLive
        ? `/api/meta/ads/${encodeURIComponent(metaAdId)}?live=1`
        : `/api/meta/ads/${encodeURIComponent(metaAdId)}`;
      const res = await fetch(url, { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j?.error === 'string' ? j.error : 'Failed to load');
        return;
      }
      setAd(j.ad ?? null);
      setMetrics(j.metrics ?? null);
      setLive(j.live ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [metaAdId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const fetchMedia = useCallback(async () => {
    setFetchingMedia(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/ads/${encodeURIComponent(metaAdId)}/fetch-media`, {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setError(typeof j?.error === 'string' ? j.error : 'Failed to fetch media');
        return;
      }
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch media');
    } finally {
      setFetchingMedia(false);
    }
  }, [metaAdId, fetchData]);

  const best = useMemo(() => {
    const src = live ?? metrics;
    if (!src) return null;
    return {
      impressions: src.impressions,
      clicks: src.clicks,
      ctr: src.ctr,
      spend: src.spend,
      cpc: src.cpc,
      roas: src.roas,
      source: live ? 'LIVE (Meta)' : 'DB snapshot',
    };
  }, [live, metrics]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/ad-management/meta?tab=ads"
            className="text-xs text-[var(--sibling-primary)] underline-offset-2 hover:underline"
          >
            ← Back to Ads
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight truncate">
            {ad?.name ?? 'Meta ad'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            metaAdId: {metaAdId}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchMedia()}
            disabled={fetchingMedia}
            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
          >
            {fetchingMedia ? 'Fetching…' : 'Fetch media'}
          </button>
          <button
            type="button"
            onClick={() => void fetchData({ live: true })}
            disabled={refreshing}
            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh metrics'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {ad && (
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Status</p>
              <p className="text-sm font-medium">{ad.status ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Ad set</p>
              <p className="text-sm font-medium">{ad.adSet?.name ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                metaAdSetId: {ad.adSet?.metaAdSetId ?? '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Metrics</h2>
          <p className="text-[10px] text-muted-foreground">{best?.source ?? 'No data'}</p>
        </div>
        {!best ? (
          <p className="mt-2 text-sm text-muted-foreground">No metrics available yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Impressions" value={String(best.impressions)} />
            <Stat label="Clicks" value={String(best.clicks)} />
            <Stat label="CTR" value={String(best.ctr)} />
            <Stat label="Spend" value={String(best.spend)} />
            <Stat label="CPC" value={best.cpc == null ? '—' : String(best.cpc)} />
            <Stat label="ROAS" value={best.roas == null ? '—' : String(best.roas)} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4">
        <h2 className="text-sm font-semibold">Creative / media</h2>
        {!ad?.creative ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No linked creative in DB yet. Run Ads sync (and/or Ad creatives sync), then come back.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-3">
              <p className="text-xs font-semibold">{ad.creative.headline}</p>
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                {ad.creative.primaryText}
              </p>
              {ad.creative.description && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {ad.creative.description}
                </p>
              )}
              <div className="mt-3 text-[10px] text-muted-foreground font-mono space-y-1">
                <p>metaCreativeId: {ad.creative.metaCreativeId ?? '—'}</p>
                <p>imageHash: {ad.creative.imageHash ?? '—'}</p>
                <p>videoId: {ad.creative.videoId ?? '—'}</p>
              </div>
              <a
                href={ad.creative.landingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-medium text-[var(--sibling-primary)] underline-offset-2 hover:underline"
              >
                Open landing URL
              </a>
            </div>

            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted/40">
                <MetaMediaPreview
                  videoUrl={ad.creative.videoUrl}
                  posterUrl={ad.creative.thumbnailUrl}
                  imageUrl={
                    ad.creative.imageUrl && !ad.creative.videoUrl ? ad.creative.imageUrl : null
                  }
                  emptyLabel="No media preview"
                />
              </div>

              {ad.creative.videoUrl && (
                <div className="mt-3">
                  <a
                    href={ad.creative.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-[var(--sibling-primary)] underline-offset-2 hover:underline break-all"
                  >
                    Open video in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


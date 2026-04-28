'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { MetaMediaPreview } from './MetaMediaPreview';

type Chapter = { timestamp?: number; title?: string; description?: string };
type ShortsHook = { start?: number; end?: number; hook_type?: string; description?: string };

type IntelligenceData = {
  language: string | null;
  contentType: string | null;
  durationSeconds: number | null;
  theme: string | null;
  sentiment: string | null;
  intensityScore: number | null;
  spiritualElements: boolean;
  titlePrimary: string | null;
  shortSummary: string | null;
  longDescription: string | null;
  tags: string[];
  tone: string[];
  topics: string[];
  targetAudience: string[];
  bestPlatforms: string[];
  visualContext: string[];
  videoGenres: string[];
  titleVariants: any;
  chapters: Chapter[] | null;
  shortsHooks: ShortsHook[] | null;
  modelVersion: string | null;
  confidence: number | null;
  processedAt: string;
};

type Item = {
  metaMediaId: string;
  metaVideoId: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  asset: {
    id: string;
    title: string;
    filename: string;
    intelligenceStatus: string | null;
    intelligence: IntelligenceData | null;
  };
};

type RankingPack = { ad: any; metrics: any; media?: any };
type RankingsResponse = {
  ok?: boolean;
  error?: string;
  datePreset?: string;
  rankings?: {
    byImpressions?: { top?: RankingPack[]; middle?: RankingPack[] };
    byClicks?: { top?: RankingPack[]; middle?: RankingPack[] };
  };
};

type SamplesResponse = {
  ok?: boolean;
  error?: string;
  datePreset?: string;
  items?: RankingPack[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
}

function prettyJson(v: unknown) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, { bg: string; text: string; border: string; dot?: string }> = {
    ACTIVE:     { bg: 'bg-emerald-500/10',    text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/25',  dot: 'bg-emerald-500' },
    PAUSED:     { bg: 'bg-amber-500/10',      text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-500/25',    dot: 'bg-amber-500' },
    DELETED:    { bg: 'bg-red-500/10',        text: 'text-red-600 dark:text-red-400',         border: 'border-red-500/25' },
    PROCESSING: { bg: 'bg-violet-500/10',     text: 'text-violet-600 dark:text-violet-400',   border: 'border-violet-500/25',   dot: 'bg-violet-500' },
    DONE:       { bg: 'bg-emerald-500/10',    text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/25',  dot: 'bg-emerald-500' },
    COMPLETED:  { bg: 'bg-emerald-500/10',    text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/25',  dot: 'bg-emerald-500' },
    FAILED:     { bg: 'bg-red-500/10',        text: 'text-red-600 dark:text-red-400',         border: 'border-red-500/25' },
    PENDING:    { bg: 'bg-[var(--glass)]/50', text: 'text-muted-foreground',                  border: 'border-[var(--glass-border)]' },
  };
  const v = map[s] ?? map.PENDING;
  const pulse = ['ACTIVE', 'DONE', 'COMPLETED', 'PROCESSING'].includes(s);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${v.bg} ${v.text} ${v.border}`}>
      {v.dot && <span className={`h-1.5 w-1.5 rounded-full ${v.dot} ${pulse ? 'animate-pulse' : ''}`} />}
      {s}
    </span>
  );
}

function ReasonBadge({ children }: { children: string }) {
  const isTop = children.toLowerCase().includes('top');
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
      isTop
        ? 'border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
        : 'border-[var(--glass-border)] bg-[var(--glass)]/40 text-muted-foreground'
    }`}>
      {isTop ? '▲' : '●'} {children}
    </span>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--sibling-primary)]/8 border border-[var(--sibling-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--sibling-primary)]">
      {children}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--glass-border)] bg-[var(--glass)]/30">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

// ─── Ad Card (horizontal scroll item) ───────────────────────────────────────

function AdCard({
  pack,
  reasons,
  onDetails,
}: {
  pack: RankingPack;
  reasons: string[];
  onDetails: () => void;
}) {
  const ad = pack.ad;
  const cr = ad?.creative ?? null;
  const id = ad?.metaAdId ?? '';
  const thumb = cr?.thumbnailUrl ?? null;
  const videoUrl = cr?.videoUrl ?? null;
  const imageUrl = cr?.imageUrl ?? null;
  const impressions: number | null = pack.metrics?.impressions ?? null;
  const clicks: number | null = pack.metrics?.clicks ?? null;

  return (
    <div className="group relative flex w-[210px] shrink-0 snap-start flex-col rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden transition-all duration-150 hover:border-[var(--glass-border)]/80 hover:shadow-md hover:bg-[var(--glass)]/20">

      {/* Thumbnail — fixed 16:9 */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0 bg-muted/50">
          <MetaMediaPreview
            videoUrl={videoUrl}
            posterUrl={thumb}
            imageUrl={!videoUrl ? imageUrl : null}
            emptyLabel="AD"
          />
        </div>
        {/* Status badge floated over thumbnail */}
        {ad?.status && (
          <div className="absolute bottom-2 left-2">
            <StatusBadge status={String(ad.status)} />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3">

        {/* Ad name */}
        <p
          className="text-xs font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]"
          title={ad?.name ?? id}
        >
          {ad?.name ?? `Ad ${id}`}
        </p>

        {/* ID */}
        <p className="font-mono text-[10px] text-muted-foreground/60 truncate" title={id}>
          {id}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {impressions != null && (
            <span className="flex items-center gap-1">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {impressions.toLocaleString()}
            </span>
          )}
          {clicks != null && (
            <span className="flex items-center gap-1">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              {clicks.toLocaleString()}
            </span>
          )}
        </div>

        {/* Reason badges — horizontal row, scrollable if overflow */}
        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reasons.map((r) => (
              <ReasonBadge key={r}>{r}</ReasonBadge>
            ))}
          </div>
        )}

        {/* Spacer pushes buttons to bottom */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--glass-border)]">
          <button
            type="button"
            onClick={onDetails}
            className="flex-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-2 py-1.5 text-[10px] font-semibold text-foreground hover:bg-[var(--glass-hover)] transition-colors text-center"
          >
            Details
          </button>
          <Link
            href={`/ad-management/meta/ads/${id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-lg bg-[var(--sibling-primary)] px-2 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity text-center"
          >
            Open ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AnalysisTab() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [rankingsTouched, setRankingsTouched] = useState(false);
  const [selected, setSelected] = useState<RankingPack | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [samples, setSamples] = useState<RankingPack[]>([]);
  const [samplesAnalyzeRunning, setSamplesAnalyzeRunning] = useState(false);
  const [samplesAnalyzeError, setSamplesAnalyzeError] = useState<string | null>(null);

  const [videoBackfillRunning, setVideoBackfillRunning] = useState(false);
  const [videoBackfillError, setVideoBackfillError] = useState<string | null>(null);
  const [videoBackfillSummary, setVideoBackfillSummary] = useState<{
    scanned: number;
    updated: number;
    failedCount: number;
    remaining: number;
  } | null>(null);

  const [winningFormulaRunning, setWinningFormulaRunning] = useState(false);
  const [winningFormulaError, setWinningFormulaError] = useState<string | null>(null);
  const [winningFormulaSummary, setWinningFormulaSummary] = useState<{
    items: number;
    mediaEligible: number;
    ads: number;
  } | null>(null);

  const anyProcessing = useMemo(
    () => items.some((i) => (i.asset.intelligenceStatus ?? '').toUpperCase() === 'PROCESSING'),
    [items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/analyzed-ads', { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        setError(typeof j?.error === 'string' ? j.error : 'Failed to load analyzed assets');
        setItems([]);
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analyzed assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    setSamplesError(null);
    try {
      const res = await fetch('/api/meta/ads/samples', { credentials: 'include' });
      const j = (await res.json().catch(() => ({}))) as SamplesResponse;
      if (!res.ok || !j?.ok) {
        setSamplesError(typeof j?.error === 'string' ? j.error : 'Failed to load sample ads');
        setSamples([]);
        return;
      }
      setSamples(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setSamplesError(e instanceof Error ? e.message : 'Failed to load sample ads');
      setSamples([]);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => { void loadSamples(); }, [loadSamples]);

  const loadRankings = useCallback(async () => {
    setRankingsTouched(true);
    setRankingsLoading(true);
    setRankingsError(null);
    try {
      const res = await fetch('/api/meta/ads/rankings', { credentials: 'include' });
      const j = (await res.json().catch(() => ({}))) as RankingsResponse;
      if (!res.ok || !j?.ok) {
        setRankingsError(typeof j?.error === 'string' ? j.error : 'Failed to load sample ads');
        setRankings(null);
        return;
      }
      setRankings(j);
      await loadSamples();
    } catch (e) {
      setRankingsError(e instanceof Error ? e.message : 'Failed to load sample ads');
      setRankings(null);
    } finally {
      setRankingsLoading(false);
    }
  }, [loadSamples]);

  useEffect(() => {
    if (!anyProcessing) return;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [anyProcessing, load]);

  const analyze = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/analyze-top-ads', { method: 'POST', credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        setError(typeof j?.error === 'string' ? j.error : 'Analyze failed');
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyze failed');
    } finally {
      setRunning(false);
    }
  };

  const analyzeSamples = async () => {
    setSamplesAnalyzeRunning(true);
    setSamplesAnalyzeError(null);
    try {
      const res = await fetch('/api/meta/ads/samples/analyze', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setSamplesAnalyzeError(typeof j?.error === 'string' ? j.error : 'Sample analysis enqueue failed');
        return;
      }
      await loadSamples();
    } catch (e) {
      setSamplesAnalyzeError(e instanceof Error ? e.message : 'Sample analysis enqueue failed');
    } finally {
      setSamplesAnalyzeRunning(false);
    }
  };

  const backfillVideosToR2 = async () => {
    setVideoBackfillRunning(true);
    setVideoBackfillError(null);
    try {
      const res = await fetch('/api/meta/media/videos/backfill-r2', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setVideoBackfillError(typeof j?.error === 'string' ? j.error : 'Video backfill failed');
        return;
      }
      setVideoBackfillSummary({
        scanned: Number(j?.scanned ?? 0),
        updated: Number(j?.updated ?? 0),
        failedCount: Number(j?.failedCount ?? 0),
        remaining: Number(j?.remaining ?? 0),
      });
    } catch (e) {
      setVideoBackfillError(e instanceof Error ? e.message : 'Video backfill failed');
    } finally {
      setVideoBackfillRunning(false);
    }
  };

  const buildWinningFormula = async () => {
    setWinningFormulaRunning(true);
    setWinningFormulaError(null);
    setWinningFormulaSummary(null);
    try {
      const res = await fetch('/api/meta/winning-formula/build', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setWinningFormulaError(typeof j?.error === 'string' ? j.error : 'Winning formula build failed');
        return;
      }
      setWinningFormulaSummary({
        items: Number(j?.counts?.items ?? 0),
        mediaEligible: Number(j?.counts?.mediaEligible ?? 0),
        ads: Number(j?.counts?.ads ?? 0),
      });
    } catch (e) {
      setWinningFormulaError(e instanceof Error ? e.message : 'Winning formula build failed');
    } finally {
      setWinningFormulaRunning(false);
    }
  };

  const packs = useMemo(() => {
    const p = rankings?.rankings;
    return {
      impressionsTop:    (p?.byImpressions?.top    ?? []).filter(Boolean),
      impressionsMiddle: (p?.byImpressions?.middle ?? []).filter(Boolean),
      clicksTop:         (p?.byClicks?.top         ?? []).filter(Boolean),
      clicksMiddle:      (p?.byClicks?.middle      ?? []).filter(Boolean),
    };
  }, [rankings]);

  const reasonsByMetaAdId = useMemo(() => {
    const map = new Map<string, string[]>();
    const add = (pack: RankingPack, label: string) => {
      const id = pack?.ad?.metaAdId;
      if (!id) return;
      const prev = map.get(id) ?? [];
      if (!prev.includes(label)) prev.push(label);
      map.set(id, prev);
    };
    for (const x of packs.impressionsTop)    add(x, 'Top (impressions)');
    for (const x of packs.impressionsMiddle) add(x, 'Middle (impressions)');
    for (const x of packs.clicksTop)         add(x, 'Top (clicks)');
    for (const x of packs.clicksMiddle)      add(x, 'Middle (clicks)');
    return map;
  }, [packs]);

  const allUniquePacks = useMemo(() => {
    const byId = new Map<string, RankingPack>();
    const add = (p: RankingPack) => {
      const id = p?.ad?.metaAdId;
      if (!id || byId.has(id)) return;
      byId.set(id, p);
    };
    for (const x of packs.impressionsTop)    add(x);
    for (const x of packs.impressionsMiddle) add(x);
    for (const x of packs.clicksTop)         add(x);
    for (const x of packs.clicksMiddle)      add(x);
    return Array.from(byId.values());
  }, [packs]);

  const visiblePacks = useMemo(() => {
    // By default, show the persisted sample ads from DB.
    // Only show the computed ranking groups after user explicitly recomputes.
    return rankingsTouched ? allUniquePacks : samples;
  }, [rankingsTouched, allUniquePacks, samples]);

  const openModal = (pack: RankingPack) => {
    const id = pack?.ad?.metaAdId;
    setSelected(pack);
    setSelectedReasons(rankingsTouched && id ? reasonsByMetaAdId.get(id) ?? [] : []);
  };

  const closeModal = () => { setSelected(null); setSelectedReasons([]); };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Analyze card */}
          <div className="rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass)]/30 to-[var(--glass)]/10 p-5">
            <div className="flex flex-col gap-4">
              <div className="min-w-0 w-full space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Ad creative analysis</h3>
                <p className="text-xs text-muted-foreground leading-relaxed w-full">
                  Syncs performance metrics for up to 50 ads, mirrors top-5 media to R2, and sends videos for intelligence processing.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => void analyze()}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <>
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                      </svg>
                      Analyze ads
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void backfillVideosToR2()}
                  disabled={videoBackfillRunning}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-2 text-xs font-semibold hover:bg-[var(--glass-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload all Meta videos missing r2Key to R2"
                >
                  {videoBackfillRunning ? 'Backfilling…' : 'Backfill videos → R2'}
                </button>

                <button
                  type="button"
                  onClick={() => void buildWinningFormula()}
                  disabled={winningFormulaRunning}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-2 text-xs font-semibold hover:bg-[var(--glass-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Build and persist winning formula from analyzed assets"
                >
                  {winningFormulaRunning ? 'Building…' : 'Build winning formula'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {error}
              </div>
            )}

            {videoBackfillError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {videoBackfillError}
              </div>
            )}

            {videoBackfillSummary && (
              <div className="mt-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/20 px-3 py-2 text-[11px] text-muted-foreground">
                Backfill complete. updated {videoBackfillSummary.updated} · remaining {videoBackfillSummary.remaining} · failed {videoBackfillSummary.failedCount}
              </div>
            )}

            {winningFormulaError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {winningFormulaError}
              </div>
            )}

            {winningFormulaSummary && (
              <div className="mt-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/20 px-3 py-2 text-[11px] text-muted-foreground">
                Winning formula persisted. items {winningFormulaSummary.items} · ads {winningFormulaSummary.ads} · eligible media {winningFormulaSummary.mediaEligible}
              </div>
            )}
          </div>

          {/* ── Sample ads card ── */}
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3 bg-[var(--glass)]/20">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Selected sample ads</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Top 3 + middle 3 by impressions &amp; clicks
                  {visiblePacks.length > 0 && (
                    <span className="ml-1.5 text-muted-foreground/60">· {visiblePacks.length} ads</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void analyzeSamples()}
                  disabled={samplesAnalyzeRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {samplesAnalyzeRunning ? (
                    <>
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enqueuing…
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3v18m9-9H3" />
                      </svg>
                      Analyze sample ads
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void loadRankings()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                  {rankingsTouched ? 'Refresh' : 'Recompute'}
                </button>
              </div>
            </div>

            {/* Error */}
            {rankingsError && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {rankingsError}
              </div>
            )}

            {samplesAnalyzeError && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {samplesAnalyzeError}
              </div>
            )}

            {/* Persisted sample ads load error */}
            {samplesError && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {samplesError}
              </div>
            )}

            {/* Loading skeletons */}
            {rankingsLoading || samplesLoading ? (
              <div
                className="flex gap-3 overflow-x-hidden px-3 py-3"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[210px] shrink-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden animate-pulse"
                  >
                    <div className="w-full bg-[var(--glass)]/30" style={{ aspectRatio: '16/9' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-[var(--glass)]/30" />
                      <div className="h-2.5 w-1/2 rounded bg-[var(--glass)]/20" />
                      <div className="h-2.5 w-2/3 rounded bg-[var(--glass)]/20" />
                      <div className="h-6 w-full rounded bg-[var(--glass)]/20 mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visiblePacks.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center gap-2 py-10 px-6 text-center">
                <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>
                </svg>
                <p className="text-sm text-muted-foreground">No sample ads yet.</p>
                <p className="text-xs text-muted-foreground/70">
                  Click <span className="font-medium text-foreground">Recompute</span> to select and persist sample ads.
                </p>
              </div>
            ) : (
              /* ── Horizontal scroll row ── */
              <div className="relative">
                {/* Fade-out hint on right edge */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background/60 to-transparent rounded-r-xl" />
                <div
                  className="flex gap-3 overflow-x-auto px-3 py-3 pb-4 snap-x snap-mandatory scroll-smooth"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--glass-border) transparent',
                  }}
                >
                  {visiblePacks.map((p) => {
                    const id = p.ad?.metaAdId ?? '';
                    const reasons = rankingsTouched && id ? reasonsByMetaAdId.get(id) ?? [] : [];
                    return (
                      <AdCard
                        key={id || Math.random()}
                        pack={p}
                        reasons={reasons}
                        onDetails={() => openModal(p)}
                      />
                    );
                  })}
                  {/* Scroll end spacer */}
                  <div className="w-1 shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN — Analyzed Assets ── */}
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3 bg-[var(--glass)]/20 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Analyzed assets</h3>
              {items.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {items.length} video{items.length !== 1 ? 's' : ''} processed
                </p>
              )}
            </div>
            {anyProcessing && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                Processing…
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 p-3 animate-pulse">
                  <div className="flex gap-3 items-center">
                    <div className="h-14 w-24 rounded-lg bg-[var(--glass)]/30 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-[var(--glass)]/30" />
                      <div className="h-2.5 w-1/2 rounded bg-[var(--glass)]/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 px-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass)]/40 border border-[var(--glass-border)]">
                <svg className="h-6 w-6 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="m15 10-4 4 6 6-4-14-6 6 4 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No analyzed videos yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <span className="font-semibold text-foreground">Analyze ads</span> to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3">
              <ul className="space-y-2.5">
                {items.map((it) => {
                  const intel = it.asset.intelligence;
                  const isOpen = Boolean(open[it.asset.id]);
                  const status = (it.asset.intelligenceStatus ?? 'PENDING').toUpperCase();
                  return (
                    <li key={it.asset.id} className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className="relative h-14 w-24 overflow-hidden rounded-lg bg-muted/50 shrink-0 ring-1 ring-black/5">
                          <MetaMediaPreview
                            videoUrl={it.videoUrl}
                            posterUrl={it.thumbnailUrl}
                            imageUrl={!it.videoUrl ? it.thumbnailUrl : null}
                            emptyLabel="VIDEO"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate" title={it.asset.title}>
                              {it.asset.title}
                            </p>
                            <StatusBadge status={status} />
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5" title={it.asset.filename}>
                            {it.asset.filename}
                          </p>
                          {it.metaVideoId && (
                            <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">{it.metaVideoId}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Link
                            href={`/ingestion/asset/${it.asset.id}/description`}
                            className="inline-flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
                          >
                            Open ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() => setOpen((p) => ({ ...p, [it.asset.id]: !isOpen }))}
                            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                              isOpen
                                ? 'border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
                                : 'border-[var(--glass-border)] bg-[var(--glass)]/30 hover:bg-[var(--glass-hover)]'
                            }`}
                          >
                            {isOpen ? '▲ Hide' : '▼ Analysis'}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[var(--glass-border)] bg-[var(--glass)]/5 p-4 space-y-3">
                          {!intel ? (
                            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-3 text-xs text-amber-700 dark:text-amber-300">
                              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              Intelligence data not yet available — may still be processing.
                            </div>
                          ) : (
                            <>
                              <SectionCard title="Summary">
                                <div className="space-y-3">
                                  {intel.titlePrimary && (
                                    <div>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Title</p>
                                      <p className="text-sm font-semibold text-foreground">{intel.titlePrimary}</p>
                                    </div>
                                  )}
                                  {intel.shortSummary && (
                                    <div>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Summary</p>
                                      <p className="text-xs text-foreground leading-relaxed">{intel.shortSummary}</p>
                                    </div>
                                  )}
                                  {intel.longDescription && (
                                    <div>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{intel.longDescription}</p>
                                    </div>
                                  )}
                                </div>
                              </SectionCard>

                              <SectionCard title="Metadata">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  {intel.theme       && <MetaField label="Theme"     value={intel.theme} />}
                                  {intel.sentiment   && <MetaField label="Sentiment" value={intel.sentiment} />}
                                  {intel.contentType && <MetaField label="Type"      value={intel.contentType} />}
                                  {intel.language    && <MetaField label="Language"  value={intel.language} />}
                                  {intel.intensityScore != null && <MetaField label="Intensity" value={`${intel.intensityScore}/10`} />}
                                  <MetaField label="Spiritual" value={intel.spiritualElements ? '✓ Yes' : '✗ No'} />
                                </div>
                              </SectionCard>

                              {(intel.tags?.length || intel.topics?.length || intel.tone?.length) ? (
                                <SectionCard title="Tags & Topics">
                                  <div className="space-y-3">
                                    {intel.tags?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
                                        <div className="flex flex-wrap gap-1">{intel.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
                                      </div>
                                    )}
                                    {intel.topics?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Topics</p>
                                        <p className="text-xs text-foreground">{intel.topics.join(' · ')}</p>
                                      </div>
                                    )}
                                    {intel.tone?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Tone</p>
                                        <p className="text-xs text-foreground">{intel.tone.join(' · ')}</p>
                                      </div>
                                    )}
                                  </div>
                                </SectionCard>
                              ) : null}

                              {intel.chapters?.length ? (
                                <SectionCard title="Chapters">
                                  <ul className="space-y-2">
                                    {intel.chapters.map((ch, idx) => (
                                      <li key={idx} className="flex gap-3 border-b border-[var(--glass-border)] pb-2 last:border-0 last:pb-0">
                                        {ch.timestamp != null && (
                                          <span className="shrink-0 rounded-md bg-[var(--glass)]/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground h-fit">
                                            {formatTime(ch.timestamp)}
                                          </span>
                                        )}
                                        <div className="min-w-0">
                                          {ch.title && <p className="text-xs font-semibold text-foreground">{ch.title}</p>}
                                          {ch.description && <p className="text-[11px] text-muted-foreground mt-0.5">{ch.description}</p>}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </SectionCard>
                              ) : null}

                              {intel.shortsHooks?.length ? (
                                <SectionCard title="Shorts Hooks">
                                  <ul className="space-y-2">
                                    {intel.shortsHooks.map((h, idx) => (
                                      <li key={idx} className="border-b border-[var(--glass-border)] pb-2 last:border-0 last:pb-0">
                                        {h.start != null && h.end != null && (
                                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--glass)]/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                            {h.start}s–{h.end}s{h.hook_type ? ` · ${h.hook_type}` : ''}
                                          </span>
                                        )}
                                        {h.description && <p className="text-xs text-foreground mt-1">{h.description}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </SectionCard>
                              ) : null}

                              <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/10 px-3 py-2.5 text-[10px] text-muted-foreground">
                                {intel.modelVersion && <span className="font-mono">model: {intel.modelVersion}</span>}
                                {intel.confidence != null && <span>confidence: {intel.confidence}</span>}
                                <span>processed: {new Date(intel.processedAt).toLocaleString()}</span>
                                </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-4xl max-h-[88vh] overflow-auto rounded-2xl border border-[var(--glass-border)] bg-background shadow-2xl">

            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--glass-border)] bg-background/95 backdrop-blur-sm p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Selected Ad</p>
                <h3 className="text-base font-semibold text-foreground truncate">
                  {selected.ad?.name ?? `Ad ${selected.ad?.metaAdId ?? ''}`}
                </h3>
                {selectedReasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedReasons.map(r => <ReasonBadge key={r}>{r}</ReasonBadge>)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selected.ad?.metaAdId && (
                  <Link
                    href={`/ad-management/meta/ads/${selected.ad.metaAdId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Open ad ↗
                  </Link>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Close modal"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-muted/30">
                  <div className="relative aspect-video">
                    <MetaMediaPreview
                      videoUrl={selected.ad?.creative?.videoUrl ?? null}
                      posterUrl={selected.ad?.creative?.thumbnailUrl ?? null}
                      imageUrl={!selected.ad?.creative?.videoUrl ? selected.ad?.creative?.imageUrl ?? null : null}
                      emptyLabel="No media"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Performance</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Impressions', value: selected.metrics?.impressions, icon: '👁' },
                      { label: 'Clicks',       value: selected.metrics?.clicks,       icon: '↗' },
                      { label: 'CTR',           value: selected.metrics?.ctr,           icon: '%' },
                      { label: 'Spend',         value: selected.metrics?.spend,         icon: '$' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="rounded-lg bg-[var(--glass)]/20 border border-[var(--glass-border)] px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{icon} {label}</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {value != null ? (typeof value === 'number' ? value.toLocaleString() : value) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ad details</h4>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-[var(--glass)]/20 border border-[var(--glass-border)] px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Ad ID</p>
                      <p className="text-xs font-mono text-foreground break-all">{selected.ad?.metaAdId ?? '—'}</p>
                    </div>
                    {selected.ad?.status && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] text-muted-foreground">Status</span>
                        <StatusBadge status={String(selected.ad.status)} />
                      </div>
                    )}
                    {[
                      { label: 'Ad set',   value: selected.ad?.adSet?.name },
                      { label: 'Headline', value: selected.ad?.creative?.headline },
                      { label: 'Landing',  value: selected.ad?.creative?.landingUrl },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[var(--glass)]/20 border border-[var(--glass-border)] px-3 py-2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-xs text-foreground break-all">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Media analysis</h4>
                  <div className="space-y-2">
                    {selected.media?.video?.asset?.id ? (
                      <div className="rounded-lg bg-[var(--glass)]/20 border border-[var(--glass-border)] px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Video asset</p>
                            <p className="text-xs font-mono text-foreground break-all">{selected.media.video.asset.id}</p>
                          </div>
                          <Link
                            href={`/ingestion/asset/${selected.media.video.asset.id}/description`}
                            className="rounded-lg border border-[var(--glass-border)] px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)] shrink-0"
                          >
                            View ↗
                          </Link>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {selected.media.video.asset.intelligenceStatus ? (
                            <StatusBadge status={String(selected.media.video.asset.intelligenceStatus)} />
                          ) : null}
                          {selected.media.video.asset.intelligence?.[0]?.titlePrimary ? (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {selected.media.video.asset.intelligence[0].titlePrimary}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No linked video asset yet.</p>
                    )}

                    {selected.media?.image?.asset?.id ? (
                      <div className="rounded-lg bg-[var(--glass)]/20 border border-[var(--glass-border)] px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Image asset</p>
                            <p className="text-xs font-mono text-foreground break-all">{selected.media.image.asset.id}</p>
                          </div>
                          <Link
                            href={`/ingestion/asset/${selected.media.image.asset.id}/description`}
                            className="rounded-lg border border-[var(--glass-border)] px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)] shrink-0"
                          >
                            View ↗
                          </Link>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {selected.media.image.asset.intelligenceStatus ? (
                            <StatusBadge status={String(selected.media.image.asset.intelligenceStatus)} />
                          ) : null}
                          {selected.media.image.asset.intelligence?.[0]?.titlePrimary ? (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {selected.media.image.asset.intelligence[0].titlePrimary}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No linked image asset yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--glass-border)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)] bg-[var(--glass)]/20">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Raw JSON</h4>
                    <span className="text-[10px] text-muted-foreground/60 font-mono">ad · metrics</span>
                  </div>
                  <pre className="max-h-[35vh] overflow-auto bg-[#0d0d0d] p-4 text-[11px] text-[#a8ff78] font-mono leading-relaxed">
                    {prettyJson({ ad: selected.ad, metrics: selected.metrics, media: selected.media ?? null })}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
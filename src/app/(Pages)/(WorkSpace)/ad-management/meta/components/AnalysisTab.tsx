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

function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${(Math.floor(sec % 60)).toString().padStart(2, '0')}`;
}

export function AnalysisTab() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!anyProcessing) return;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [anyProcessing, load]);

  const analyze = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/analyze-top-ads', {
        method: 'POST',
        credentials: 'include',
      });
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

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20 p-4">
            <h3 className="text-sm font-semibold">Ad creative analysis</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Syncs performance metrics for up to 50 ads (top impressions + most recent) into the company metrics table, then pulls media from the top 5 current ads, mirrors it to R2, and sends videos for intelligence processing.
            </p>
            <button
              type="button"
              onClick={() => void analyze()}
              disabled={running}
              className="mt-4 rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {running ? 'Analyzing…' : 'Analyze ads'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20">
          <div className="border-b border-[var(--glass-border)] px-3 py-2">
            <h3 className="text-sm font-semibold">Analyzed assets</h3>
          </div>

          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No analyzed videos yet. Click <span className="font-medium text-foreground">Analyze ads</span>.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-260px)] overflow-auto p-3">
              <ul className="space-y-3">
                {items.map((it) => {
                  const intel = it.asset.intelligence;
                  const isOpen = Boolean(open[it.asset.id]);
                  const status = (it.asset.intelligenceStatus ?? 'PENDING').toUpperCase();
                  return (
                    <li key={it.asset.id} className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10">
                      <div className="flex items-center gap-3 p-3">
                        <div className="relative h-14 w-24 overflow-hidden rounded-lg bg-muted/40 shrink-0">
                          <MetaMediaPreview
                            videoUrl={it.videoUrl}
                            posterUrl={it.thumbnailUrl}
                            imageUrl={!it.videoUrl ? it.thumbnailUrl : null}
                            emptyLabel="VIDEO"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate" title={it.asset.title}>
                              {it.asset.title}
                            </p>
                            <Badge>{status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" title={it.asset.filename}>
                            {it.asset.filename}
                          </p>
                          {it.metaVideoId && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono">metaVideoId: {it.metaVideoId}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/ingestion/asset/${it.asset.id}/description`}
                            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)]"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => setOpen((p) => ({ ...p, [it.asset.id]: !isOpen }))}
                            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-[10px] font-semibold hover:bg-[var(--glass-hover)]"
                          >
                            {isOpen ? 'Hide' : 'View'} analysis
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[var(--glass-border)] p-4 space-y-4">
                          {!intel ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                              Intelligence data not available yet. This may still be processing.
                            </div>
                          ) : (
                            <>
                              <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                <h4 className="text-xs font-semibold mb-2">Summary & description</h4>
                                <div className="space-y-2 text-sm">
                                  {intel.titlePrimary && (
                                    <div>
                                      <span className="text-xs text-muted-foreground block">Primary title</span>
                                      <p className="text-foreground">{intel.titlePrimary}</p>
                                    </div>
                                  )}
                                  {intel.shortSummary && (
                                    <div>
                                      <span className="text-xs text-muted-foreground block">Short summary</span>
                                      <p className="text-foreground">{intel.shortSummary}</p>
                                    </div>
                                  )}
                                  {intel.longDescription && (
                                    <div>
                                      <span className="text-xs text-muted-foreground block">Long description</span>
                                      <p className="text-foreground whitespace-pre-wrap">{intel.longDescription}</p>
                                    </div>
                                  )}
                                </div>
                              </section>

                              <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                <h4 className="text-xs font-semibold mb-2">Meta</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                  {intel.theme && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Theme</span>
                                      <p className="text-foreground">{intel.theme}</p>
                                    </div>
                                  )}
                                  {intel.sentiment && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Sentiment</span>
                                      <p className="text-foreground">{intel.sentiment}</p>
                                    </div>
                                  )}
                                  {intel.contentType && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Content type</span>
                                      <p className="text-foreground">{intel.contentType}</p>
                                    </div>
                                  )}
                                  {intel.language && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Language</span>
                                      <p className="text-foreground">{intel.language}</p>
                                    </div>
                                  )}
                                  {intel.intensityScore != null && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Intensity</span>
                                      <p className="text-foreground">{intel.intensityScore}</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-[10px] text-muted-foreground block">Spiritual elements</span>
                                    <p className="text-foreground">{intel.spiritualElements ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>
                              </section>

                              {(intel.tags?.length || intel.topics?.length || intel.tone?.length) ? (
                                <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                  <h4 className="text-xs font-semibold mb-2">Tags & topics</h4>
                                  <div className="space-y-3 text-sm">
                                    {Array.isArray(intel.tags) && intel.tags.length > 0 && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block mb-1">Tags</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {intel.tags.map((t) => (
                                            <span key={t} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px]">
                                              {t}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {Array.isArray(intel.topics) && intel.topics.length > 0 && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block mb-1">Topics</span>
                                        <p className="text-foreground">{intel.topics.join(', ')}</p>
                                      </div>
                                    )}
                                    {Array.isArray(intel.tone) && intel.tone.length > 0 && (
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block mb-1">Tone</span>
                                        <p className="text-foreground">{intel.tone.join(', ')}</p>
                                      </div>
                                    )}
                                  </div>
                                </section>
                              ) : null}

                              {Array.isArray(intel.chapters) && intel.chapters.length > 0 && (
                                <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                  <h4 className="text-xs font-semibold mb-2">Chapters</h4>
                                  <ul className="space-y-2 text-sm">
                                    {intel.chapters.map((ch, idx) => (
                                      <li key={idx} className="flex gap-3 border-b border-[var(--glass-border)] pb-2 last:border-0">
                                        {ch.timestamp != null && (
                                          <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                            {formatTime(ch.timestamp)}
                                          </span>
                                        )}
                                        <div className="min-w-0">
                                          {ch.title && <p className="font-medium text-foreground">{ch.title}</p>}
                                          {ch.description && <p className="text-muted-foreground text-xs mt-0.5">{ch.description}</p>}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )}

                              {Array.isArray(intel.shortsHooks) && intel.shortsHooks.length > 0 && (
                                <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                  <h4 className="text-xs font-semibold mb-2">Shorts hooks</h4>
                                  <ul className="space-y-2 text-sm">
                                    {intel.shortsHooks.map((h, idx) => (
                                      <li key={idx} className="border-b border-[var(--glass-border)] pb-2 last:border-0">
                                        {h.start != null && h.end != null && (
                                          <span className="text-muted-foreground text-xs font-mono">
                                            {h.start}s – {h.end}s{h.hook_type ? ` · ${h.hook_type}` : ''}
                                          </span>
                                        )}
                                        {h.description && <p className="text-foreground mt-0.5">{h.description}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )}

                              <section className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 p-4">
                                <h4 className="text-xs font-semibold mb-2">Processing info</h4>
                                <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                                  {intel.modelVersion && <span>Model: {intel.modelVersion}</span>}
                                  {intel.confidence != null && <span>Confidence: {intel.confidence}</span>}
                                  <span>Processed: {new Date(intel.processedAt).toLocaleString()}</span>
                                </div>
                              </section>
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
    </div>
  );
}


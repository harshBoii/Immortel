'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type AssetData = {
  id: string;
  title: string;
  filename: string;
  assetType: string;
  status: string;
  duration: number | null;
  resolution: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  streamId: string | null;
  createdAt: string;
};

type TitleVariants = {
  seo?: string;
  emotional?: string;
  clickbait?: string;
} | null;

type Chapter = { timestamp?: number; title?: string; description?: string };
type ShortsHook = { start?: number; end?: number; hook_type?: string; description?: string };

type IntelligenceData = {
  id: string;
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
  titleVariants: TitleVariants;
  chapters: Chapter[] | null;
  shortsHooks: ShortsHook[] | null;
  clipfoxInsights: unknown;
  modelVersion: string | null;
  confidence: number | null;
  processedAt: string;
};

export default function AssetDescriptionPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (cancelled) return;
      setAssetId(p.assetId);
    });
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/assets/${assetId}/description`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setError(data.error ?? 'Failed to load');
          setAsset(null);
          setIntelligence(null);
          return;
        }
        setAsset(data.data.asset);
        setIntelligence(data.data.intelligence);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [assetId]);

  if (loading || !assetId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-6">
        <Link
          href="/ingestion"
          className="text-sm text-primary hover:underline mb-4 inline-block"
        >
          ← Back to Ingestion
        </Link>
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-destructive">{error ?? 'Asset not found'}</p>
        </div>
      </div>
    );
  }

  const hasPlayback = Boolean(asset.playbackUrl);
  const intel = intelligence;

  return (
    <div className="p-6 h-full">
      <Link
        href="/ingestion"
        className="text-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Back to Ingestion
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Top-left quarter: video player */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl overflow-hidden sticky top-6">
            <div className="aspect-video bg-muted/30 flex items-center justify-center">
              {hasPlayback ? (
                <video
                  key={asset.playbackUrl ?? ''}
                  src={asset.playbackUrl ?? undefined}
                  controls
                  className="w-full h-full object-contain"
                  poster={asset.thumbnailUrl ?? undefined}
                />
              ) : (
                <div className="text-center p-6">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-contain max-h-48 mx-auto"
                    />
                  ) : (
                    <span className="text-4xl text-muted-foreground/50">🎬</span>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Video is still processing
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Playback will appear when ready
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--glass-border)]">
              <p className="text-sm font-medium text-foreground truncate" title={asset.title}>
                {asset.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{asset.filename}</p>
              {(asset.duration != null || asset.resolution) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {asset.duration != null &&
                    `${Math.floor(asset.duration / 60)}:${(asset.duration % 60).toString().padStart(2, '0')}`}
                  {asset.duration != null && asset.resolution && ' · '}
                  {asset.resolution}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Remaining: asset intelligence data */}
        <div className="lg:col-span-3 space-y-6">
          {!intel ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No intelligence data yet for this asset.</p>
              <p className="text-xs text-muted-foreground mt-1">It may still be processing.</p>
            </div>
          ) : (
            <>
              {/* Summary & descriptions */}
              <section className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Summary & description</h2>
                <div className="space-y-3 text-sm">
                  {intel.titlePrimary && (
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Primary title</span>
                      <p className="text-foreground">{intel.titlePrimary}</p>
                    </div>
                  )}
                  {intel.shortSummary && (
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Short summary</span>
                      <p className="text-foreground">{intel.shortSummary}</p>
                    </div>
                  )}
                  {intel.longDescription && (
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Long description</span>
                      <p className="text-foreground whitespace-pre-wrap">{intel.longDescription}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Meta: theme, sentiment, content type, etc. */}
              <section className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Meta</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {intel.theme && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Theme</span>
                      <p className="text-foreground">{intel.theme}</p>
                    </div>
                  )}
                  {intel.sentiment && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Sentiment</span>
                      <p className="text-foreground">{intel.sentiment}</p>
                    </div>
                  )}
                  {intel.contentType && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Content type</span>
                      <p className="text-foreground">{intel.contentType}</p>
                    </div>
                  )}
                  {intel.language && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Language</span>
                      <p className="text-foreground">{intel.language}</p>
                    </div>
                  )}
                  {intel.intensityScore != null && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Intensity</span>
                      <p className="text-foreground">{intel.intensityScore}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground block text-xs">Spiritual elements</span>
                    <p className="text-foreground">{intel.spiritualElements ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </section>

              {/* Tags, topics, tone */}
              <section className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Tags & topics</h2>
                <div className="space-y-3 text-sm">
                  {intel.tags.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {intel.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {intel.topics.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Topics</span>
                      <div className="flex flex-wrap gap-1.5">
                        {intel.topics.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {intel.tone.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Tone</span>
                      <div className="flex flex-wrap gap-1.5">
                        {intel.tone.map((t) => (
                          <span key={t} className="text-foreground text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Audience & platforms */}
              <section className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Audience & platforms</h2>
                <div className="space-y-3 text-sm">
                  {intel.targetAudience.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Target audience</span>
                      <p className="text-foreground">{intel.targetAudience.join(', ')}</p>
                    </div>
                  )}
                  {intel.bestPlatforms.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Best platforms</span>
                      <div className="flex flex-wrap gap-1.5">
                        {intel.bestPlatforms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {intel.videoGenres.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Video genres</span>
                      <p className="text-foreground">{intel.videoGenres.join(', ')}</p>
                    </div>
                  )}
                  {intel.visualContext.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Visual context</span>
                      <p className="text-foreground">{intel.visualContext.join(', ')}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Title variants */}
              {intel.titleVariants &&
                typeof intel.titleVariants === 'object' &&
                (intel.titleVariants.seo || intel.titleVariants.emotional || intel.titleVariants.clickbait) && (
                  <section className="glass-card rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Title variants</h2>
                    <div className="space-y-2 text-sm">
                      {intel.titleVariants.seo && (
                        <div>
                          <span className="text-muted-foreground text-xs">SEO</span>
                          <p className="text-foreground">{intel.titleVariants.seo}</p>
                        </div>
                      )}
                      {intel.titleVariants.emotional && (
                        <div>
                          <span className="text-muted-foreground text-xs">Emotional</span>
                          <p className="text-foreground">{intel.titleVariants.emotional}</p>
                        </div>
                      )}
                      {intel.titleVariants.clickbait && (
                        <div>
                          <span className="text-muted-foreground text-xs">Clickbait</span>
                          <p className="text-foreground">{intel.titleVariants.clickbait}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

              {/* Chapters */}
              {intel.chapters &&
                Array.isArray(intel.chapters) &&
                intel.chapters.length > 0 && (
                  <section className="glass-card rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Chapters</h2>
                    <ul className="space-y-2 text-sm">
                      {intel.chapters.map((ch, i) => (
                        <li key={i} className="flex gap-3 border-b border-[var(--glass-border)] pb-2 last:border-0">
                          {ch.timestamp != null && (
                            <span className="text-muted-foreground shrink-0 font-mono text-xs">
                              {Math.floor(ch.timestamp / 60)}:{(ch.timestamp % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                          <div className="min-w-0">
                            {ch.title && <p className="font-medium text-foreground">{ch.title}</p>}
                            {ch.description && (
                              <p className="text-muted-foreground text-xs mt-0.5">{ch.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Shorts hooks */}
              {intel.shortsHooks &&
                Array.isArray(intel.shortsHooks) &&
                intel.shortsHooks.length > 0 && (
                  <section className="glass-card rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Shorts hooks</h2>
                    <ul className="space-y-2 text-sm">
                      {intel.shortsHooks.map((h, i) => (
                        <li key={i} className="border-b border-[var(--glass-border)] pb-2 last:border-0">
                          {h.start != null && h.end != null && (
                            <span className="text-muted-foreground text-xs font-mono">
                              {h.start}s – {h.end}s
                              {h.hook_type ? ` · ${h.hook_type}` : ''}
                            </span>
                          )}
                          {h.description && (
                            <p className="text-foreground mt-0.5">{h.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Model info */}
              <section className="glass-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Processing info</h2>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {intel.modelVersion && <span>Model: {intel.modelVersion}</span>}
                  {intel.confidence != null && <span>Confidence: {intel.confidence}</span>}
                  <span>Processed: {new Date(intel.processedAt).toLocaleString()}</span>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

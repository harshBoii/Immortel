"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GeoKnightWorkspaceData } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import type { CitationContextRow } from "@/lib/geo/radar/aggregateCitationContext";
import { RadarCompareCharts } from "@/app/(Pages)/(WorkSpace)/geo/radar/sov-charts";
import { MiniSpark } from "@/app/(Pages)/(WorkSpace)/geo/report/metric-sparklines";
import type { HighlightPrompt } from "@/app/(Pages)/(WorkSpace)/geo/report/pick-highlight-prompts";
import { CitationsTable } from "@/app/(Pages)/(WorkSpace)/geo/radar/citations-table";
import type { CitationRow } from "@/app/(Pages)/(WorkSpace)/geo/radar/citations-table";
import RadarRefreshButton from "@/app/(Pages)/(WorkSpace)/geo/radar/refresh-button";
import { RevenueChip } from "@/app/components/geo/revenue-chip";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

type RadarPayload = Awaited<
  ReturnType<typeof import("@/lib/geo/radar/buildRadarGetPayload").buildRadarGetPayload>
>;

function formatMetric(
  value: number | null | undefined,
  opts: { suffix?: string; prefix?: string; digits?: number } = {}
) {
  const { suffix = "", prefix = "", digits = 1 } = opts;
  if (value == null || Number.isNaN(value)) return "—";
  return `${prefix}${Number(value).toFixed(digits)}${suffix}`;
}

function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M/mo`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}k/mo`;
  return `$${Math.round(value).toLocaleString()}/mo`;
}

function matchesSearch(q: string, ...parts: (string | null | undefined)[]) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((p) => (p ?? "").toLowerCase().includes(needle));
}

export default function HomeDashboard({
  payload,
  geoKnight,
  rivalsForCharts,
  sparkSeries,
  contextRows,
  highlightPrompts: _highlightPrompts,
  recentCitations,
}: {
  payload: RadarPayload;
  geoKnight: GeoKnightWorkspaceData;
  rivalsForCharts: Array<{ id: string; name: string }>;
  sparkSeries: { sov: number[]; top3: number[]; coverage: number[]; rank: number[] };
  contextRows: CitationContextRow[];
  highlightPrompts: HighlightPrompt[];
  recentCitations: CitationRow[];
}) {
  const [search, setSearch] = useState("");

  const ourName = payload.company?.name?.trim() ?? "Your company";
  const latest = payload.latest;

  const activePromptCount = useMemo(
    () => geoKnight.topicViews.reduce((s, t) => s + t.prompts.length, 0),
    [geoKnight.topicViews]
  );

  const hasRadarMetrics = payload.metrics.length > 0;
  const hasIntel = payload.citationIntelligence.length > 0;
  const hasBounties = payload.bountyPriority.open.length > 0;

  /** Top bounties for this card: highest estimated revenue first (tie-break: reach). */
  const bountyPriorityTopByRevenue = useMemo(() => {
    const copy = [...payload.bountyPriority.open];
    copy.sort((a, b) => {
      const ar = a.estimatedRevenue ?? -Infinity;
      const br = b.estimatedRevenue ?? -Infinity;
      if (br !== ar) return br - ar;
      return (b.estimatedReach ?? 0) - (a.estimatedReach ?? 0);
    });
    return copy.slice(0, 3);
  }, [payload.bountyPriority.open]);

  const bountyTop3Combined = useMemo(() => {
    const reach = bountyPriorityTopByRevenue.reduce((s, b) => s + (b.estimatedReach ?? 0), 0);
    const revenue = bountyPriorityTopByRevenue.reduce((s, b) => s + (b.estimatedRevenue ?? 0), 0);
    return { reach, revenue };
  }, [bountyPriorityTopByRevenue]);
  const hasActionQueue = payload.actionQueue.length > 0;
  const hasTopicAuthority = payload.topicAuthorityMap.length > 0;
  const hasAnyData = hasRadarMetrics || hasIntel || hasBounties;

  /** Maps topicId → total active prompts count (from GeoKnight live topics). */
  const totalPromptsByTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of geoKnight.topicViews) m.set(t.id, t.prompts.length);
    return m;
  }, [geoKnight.topicViews]);

  /** Maps topicId → count of prompts with `ishunted` (AEO page created via Get Cited). */
  const huntedPromptsByTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of geoKnight.topicViews) {
      const n = t.prompts.filter((p) => p.ishunted).length;
      m.set(t.id, n);
    }
    return m;
  }, [geoKnight.topicViews]);

  /**
   * Tiered authority multiplier based on how many active prompts the topic has.
   * More prompts = higher ceiling, because a well-covered topic should score higher.
   * Score = max(10, min(100, round(multiplier × completionRate))).
   */
  function topicTierMultiplier(n: number): number {
    if (n <= 5)  return 20;
    if (n <= 9)  return 35;
    if (n <= 20) return 50;
    if (n <= 50) return 75;
    return 100;
  }

  function topicAuthorityScore(totalPrompts: number, completedPrompts: number): number {
    const completion = totalPrompts > 0 ? completedPrompts / totalPrompts : 0;
    return Math.max(10, Math.min(100, Math.round(topicTierMultiplier(totalPrompts) * completion)));
  }

  const topicAuthorityRows = useMemo(
    () =>
      payload.topicAuthorityMap
        .map((t) => {
          const total = totalPromptsByTopic.get(t.topicId) ?? t.promptCount;
          const hunted = Math.min(huntedPromptsByTopic.get(t.topicId) ?? 0, total);
          const completionPct = total > 0 ? Math.round((hunted / total) * 100) : 0;
          const score = topicAuthorityScore(total, hunted);
          return { ...t, total, hunted, completionPct, score };
        })
        .sort((a, b) => b.score - a.score),
    [payload.topicAuthorityMap, totalPromptsByTopic, huntedPromptsByTopic]
  );

  const filteredCitationIntel = useMemo(
    () => payload.citationIntelligence.filter((row) => matchesSearch(search, row.query)),
    [payload.citationIntelligence, search]
  );

  const radarChartData = useMemo(() => {
    if (!latest) return [];
    const avgWinRate =
      payload.citationIntelligence.length > 0
        ? payload.citationIntelligence.reduce((s, r) => s + r.winRate, 0) /
          payload.citationIntelligence.length
        : 0;
    return [
      { subject: "SoV", value: latest.shareOfVoice ?? 0, fullMark: 100 },
      { subject: "Top-3", value: latest.top3Rate ?? 0, fullMark: 100 },
      { subject: "Coverage", value: latest.queryCoverage ?? 0, fullMark: 100 },
      { subject: "Win Rate", value: avgWinRate, fullMark: 100 },
      {
        subject: "Rank Score",
        value: Math.max(0, 100 - (latest.competitorRank ?? 50) * 10),
        fullMark: 100,
      },
    ];
  }, [latest, payload.citationIntelligence]);

  const calculatedDate = latest?.calculatedAt
    ? new Date(latest.calculatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-6xl mx-auto min-h-[60vh] px-4 pb-10 pt-2 md:px-6 print:max-w-none print:px-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-heading tracking-tight md:text-3xl">
            GEO Authority Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            A curated analysis of search dominance, model sentiment, and actionable growth vectors
            for the current cycle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {calculatedDate && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              LAST {calculatedDate}
            </div>
          )}
          <RadarRefreshButton />
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!hasAnyData && (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center text-sm text-muted-foreground">
          No intelligence data yet. Click <strong>Refresh data</strong> above, or add topics in{" "}
          <Link
            href="/geo/geoknight"
            className="font-semibold text-[var(--sibling-primary)] hover:underline"
          >
            GeoKnight
          </Link>
          .
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────── */}
      {hasRadarMetrics && (
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "SHARE OF VOICE",
              value: formatMetric(latest?.shareOfVoice, { suffix: "%", digits: 1 }),
              note: "Relative mentions",
              spark: sparkSeries.sov,
              stroke: "var(--sibling-primary)",
            },
            {
              label: "TOP-3 MENTION RATE",
              value: formatMetric(latest?.top3Rate, { suffix: "%", digits: 0 }),
              note: `Benchmark ~${payload.top3BenchmarkPct}%`,
              spark: sparkSeries.top3,
              stroke: "#22c55e",
            },
            {
              label: "QUERY COVERAGE",
              value: formatMetric(latest?.queryCoverage, { suffix: "%", digits: 1 }),
              note: "Tracked queries",
              spark: sparkSeries.coverage,
              stroke: "#3b82f6",
            },
            {
              label: "RANK VS COMPETITORS",
              value: formatMetric(latest?.competitorRank, { prefix: "#", digits: 1 }),
              note: `Avg #${formatMetric(latest?.avgRank, { digits: 1 })}`,
              spark: sparkSeries.rank,
              stroke: "var(--sibling-accent)",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="glass-card card-anime-float flex flex-col rounded-xl border border-[var(--glass-border)] p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{card.note}</p>
              <MiniSpark data={card.spark} stroke={card.stroke} />
            </div>
          ))}
        </section>
      )}


      {/* ── SoV Trend + Model Breakdown ───────────────────────────── */}
      {hasRadarMetrics && (
        <section className="mt-6">
          <RadarCompareCharts
            base={{ sovSeries: payload.sovSeries, modelBreakdown: payload.modelBreakdown }}
            rivals={rivalsForCharts}
          />
        </section>
      )}

      {/* ── Topic Authority Quadrant + Bounty Priorities ──────────── */}
      {(hasTopicAuthority || hasBounties) && (
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          {hasTopicAuthority && (
            <div className="glass-card card-anime-float rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground font-heading">
                Topic Authority
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prompts hunted (AEO) vs tracked · score 10–100
              </p>
              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto glass-scrollbar pr-1">
                {topicAuthorityRows.map((t) => (
                  <div
                    key={t.topicId}
                    className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2.5 text-xs"
                  >
                    {/* top row: name + score badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{t.topicName}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {t.hunted}/{t.total} prompts hunted
                          <span className="mx-1 opacity-40">·</span>
                          {t.difficulty} difficulty
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                        style={{
                          background: t.score >= 70
                            ? "oklch(0.52 0.18 145 / 0.15)"
                            : t.score >= 40
                            ? "oklch(0.68 0.18 72 / 0.15)"
                            : "oklch(0.52 0.03 240 / 0.12)",
                          color: t.score >= 70
                            ? "oklch(0.38 0.16 145)"
                            : t.score >= 40
                            ? "oklch(0.44 0.16 72)"
                            : "var(--muted-foreground)",
                          border: "1px solid",
                          borderColor: t.score >= 70
                            ? "oklch(0.52 0.18 145 / 0.30)"
                            : t.score >= 40
                            ? "oklch(0.68 0.18 72 / 0.28)"
                            : "oklch(0.52 0.03 240 / 0.20)",
                        }}
                      >
                        {t.score}
                      </span>
                    </div>

                    {/* completion bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative flex-1 h-1.5 overflow-hidden rounded-full bg-[var(--glass-border)]/60">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{
                            width: `${t.completionPct}%`,
                            background: t.score >= 70
                              ? "oklch(0.52 0.18 145)"
                              : t.score >= 40
                              ? "oklch(0.68 0.18 72)"
                              : "var(--sibling-accent)",
                          }}
                        />
                      </div>
                      <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground w-8 text-right">
                        {t.completionPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasBounties && (
            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--sibling-surface,hsl(224,24%,12%))] p-5 text-[hsl(220,22%,94%)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--sibling-accent)]">
                Bounty Priorities
              </p>
              <p className="mt-1 text-xs text-[hsl(220,16%,78%)]">
                Ranked by est. revenue (top 3). Combined reach{" "}
                {bountyTop3Combined.reach.toLocaleString()} · combined est.{" "}
                {formatUsd(bountyTop3Combined.revenue)}
              </p>
              <div className="mt-4 space-y-3">
                {bountyPriorityTopByRevenue.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-white/12 bg-[hsl(226,22%,16%)]/90 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold leading-snug line-clamp-2 text-[hsl(220,24%,96%)]">
                        {b.query}
                      </p>
                      {b.suggestedCluster && (
                        <span className="shrink-0 rounded-full border border-[var(--sibling-accent)]/50 bg-[var(--sibling-accent)]/18 px-2 py-0.5 text-[10px] font-medium text-[hsl(160,55%,72%)]">
                          {b.suggestedCluster}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[hsl(220,14%,72%)]">
                        <span>
                          Score <span className="tabular-nums text-[hsl(220,20%,88%)]">{Math.round(b.priorityScore)}</span>
                        </span>
                        {b.estimatedReach != null && (
                          <span>
                            Reach{" "}
                            <span className="tabular-nums text-[hsl(220,20%,88%)]">
                              {b.estimatedReach.toLocaleString()}
                            </span>
                          </span>
                        )}
                      </div>
                      {b.estimatedRevenue != null && Number.isFinite(b.estimatedRevenue) ? (
                        <RevenueChip
                          amount={b.estimatedRevenue}
                          tooltipTitle="Bounty revenue estimate"
                          tooltipLines={[
                            "Same resolution as Bounty / GeoKnight: PromptRevenue (or funnel) per query wins over citation bounty estimate; else reach × conversion × AOV.",
                          ]}
                          breakdown={b.revenueBreakdown ?? undefined}
                          size="sm"
                          className="shrink-0"
                        />
                      ) : (
                        <span className="text-[10px] text-[hsl(220,12%,58%)]">Est. revenue —</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/geo/bounty"
                className="mt-4 inline-flex text-xs font-semibold text-[hsl(160,50%,58%)] hover:text-[hsl(160,48%,68%)] hover:underline"
              >
                View all bounties →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Recent Model Citations + Historical Radar Metrics ─────── */}
      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {recentCitations.length > 0 && (
          <div className="glass-card card-anime-float rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground font-heading">
              Recent Model Citations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest citation events from tracked prompts
            </p>
            <CitationsTable citations={recentCitations} ourCompanyName={ourName} />
          </div>
        )}

        {hasRadarMetrics && radarChartData.length > 0 && (
          <div className="glass-card card-anime-float rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground font-heading">
              Historical Radar Metrics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest radar run snapshot</p>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="var(--glass-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar
                    dataKey="value"
                    stroke="var(--sibling-accent)"
                    fill="var(--sibling-accent)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Model</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">SoV</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Top-3</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.metrics.slice(0, 6).map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-[var(--glass-border)]/50"
                    >
                      <td className="py-1.5 font-medium text-foreground">{m.model}</td>
                      <td className="text-right py-1.5 tabular-nums">
                        {m.shareOfVoice != null ? `${m.shareOfVoice.toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-right py-1.5 tabular-nums">
                        {m.top3Rate != null ? `${m.top3Rate.toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-right py-1.5 tabular-nums">
                        {m.queryCoverage != null ? `${m.queryCoverage.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────── */}
      {hasAnyData && (
        <section className="mt-10 rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass)] to-[var(--glass)]/70 p-8 text-center print:mt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground md:text-2xl">
            Ready to challenge a topic?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Jump into GeoKnight for simulations, refresh Company Radar for the latest microservice
            run, or open Bounty to hunt high-impact queries.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row print:hidden">
            <Link
              href="/geo/geoknight"
              className="inline-flex min-w-[180px] justify-center rounded-lg bg-[var(--sibling-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--sibling-surface)] shadow-sm hover:opacity-95"
            >
              Simulate topic duel
            </Link>
            <Link
              href="/geo/radar"
              className="inline-flex min-w-[180px] justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/90 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--glass-hover)]"
            >
              Company Radar
            </Link>
            <Link
              href="/geo/bounty"
              className="inline-flex min-w-[180px] justify-center rounded-lg bg-[var(--sibling-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            >
              Open Bounty
            </Link>
          </div>
        </section>
      )}

      {/* ── Live status bar ───────────────────────────────────────── */}
      {hasAnyData && (
        <div className="mt-6 rounded-xl border border-[var(--glass-border)] bg-[var(--sibling-surface,hsl(224,24%,12%))] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-[var(--sibling-surface-fg,hsl(220,20%,88%))] opacity-80">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            {activePromptCount > 0 && (
              <span>{activePromptCount} ACTIVE PROMPTS SCANNING</span>
            )}
            {payload.topicAuthorityMap.length > 0 && (
              <span>{payload.topicAuthorityMap.length} TOPIC NODES</span>
            )}
          </div>
          {calculatedDate && <span className="opacity-60">UPDATED {calculatedDate}</span>}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GeoKnightWorkspaceData } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import type { CitationContextRow } from "@/lib/geo/radar/aggregateCitationContext";
import { RadarCompareCharts } from "../radar/sov-charts";
import { MiniSpark } from "./metric-sparklines";
import type { HighlightPrompt } from "./pick-highlight-prompts";

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

/** Compile the search input as a case-insensitive regex; fall back to literal includes on invalid patterns. */
function buildSearchRegex(q: string): RegExp | null {
  const t = q.trim();
  if (!t) return null;
  try {
    return new RegExp(t, "i");
  } catch {
    return new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
}

function matchesSearch(q: string, ...parts: (string | null | undefined)[]) {
  const re = buildSearchRegex(q);
  if (!re) return true;
  return parts.some((p) => re.test(p ?? ""));
}

/**
 * Returns true when the company name appears in a prompt's consensus or byModel rows.
 * Uses a regex built from the company name (escaped for safety) to tolerate minor casing / spacing differences.
 */
function companyInPrompt(
  prompt: { consensus: { companyName: string }[]; byModel: { companyName: string }[] },
  companyRegex: RegExp
): boolean {
  return (
    prompt.consensus.some((c) => companyRegex.test(c.companyName)) ||
    prompt.byModel.some((c) => companyRegex.test(c.companyName))
  );
}

export default function IntelligenceReport({
  payload,
  geoKnight,
  rivalsForCharts,
  sparkSeries,
  contextRows,
  highlightPrompts,
}: {
  payload: RadarPayload;
  geoKnight: GeoKnightWorkspaceData;
  rivalsForCharts: Array<{ id: string; name: string }>;
  sparkSeries: { sov: number[]; top3: number[]; coverage: number[]; rank: number[] };
  contextRows: CitationContextRow[];
  highlightPrompts: HighlightPrompt[];
}) {
  const [search, setSearch] = useState("");

  const ourName = payload.company?.name?.trim() ?? "Your company";
  const latest = payload.latest;

  const activePromptCount = useMemo(
    () => geoKnight.topicViews.reduce((s, t) => s + t.prompts.length, 0),
    [geoKnight.topicViews]
  );
  const promptsTracked = payload.citationIntelligence.length;

  const hasRadarMetrics = payload.metrics.length > 0;
  const hasIntel = payload.citationIntelligence.length > 0;
  const hasBounties = payload.bountyPriority.open.length > 0;
  const hasRadarContent = hasRadarMetrics || hasIntel || hasBounties;
  const hasGeoKnightTopics = geoKnight.topicViews.length > 0;

  /** Regex built from the authenticated company name — used to detect company presence in rival rows. */
  const companyRegex = useMemo(() => {
    const escaped = ourName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i");
  }, [ourName]);

  /** Rival comparison: only prompts where ourName appears in consensus or per-model rows. */
  const companyHighlightPrompts = useMemo(
    () => highlightPrompts.filter((p) => companyInPrompt(p, companyRegex)),
    [highlightPrompts, companyRegex]
  );

  /** Citation intel: top 10 with win% > 0 whose query matches the search regex. */
  const filteredCitationIntel = useMemo(() => {
    return payload.citationIntelligence
      .filter((row) => row.winRate > 0 && matchesSearch(search, row.query))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);
  }, [payload.citationIntelligence, search]);

  return (
    <div
      data-intelligence-report
      className="max-w-6xl mx-auto min-h-[60vh] px-4 pb-10 pt-2 md:px-6 print:max-w-none print:px-6"
    >
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-heading tracking-tight md:text-3xl">
            Report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consolidated radar metrics, topic authority, and GeoKnight rival signals.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-sm">
          <label className="sr-only" htmlFor="intel-report-search">
            Search
          </label>
          <input
            id="intel-report-search"
            type="search"
            placeholder="Search prompts, topics, clusters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--sibling-primary)]/35"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-[var(--glass-border)] bg-[var(--sibling-accent)]/10 px-3 py-2 text-xs font-semibold text-[var(--sibling-accent)] hover:bg-[var(--sibling-accent)]/16"
          >
            Download PDF / Print
          </button>
        </div>
      </div>

      {!hasRadarContent && !hasGeoKnightTopics ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center text-sm text-muted-foreground">
          No intelligence data yet. Run <strong>Refresh data</strong> on{" "}
          <Link href="/geo/radar" className="font-semibold text-[var(--sibling-primary)] hover:underline">
            Company Radar
          </Link>{" "}
          and add topics in{" "}
          <Link href="/geo/geoknight" className="font-semibold text-[var(--sibling-primary)] hover:underline">
            GeoKnight
          </Link>
          .
        </div>
      ) : null}

      {/* Hero */}
      {(hasRadarContent || hasGeoKnightTopics) && (
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-stretch">
          <div className="glass-card card-anime-float relative overflow-hidden rounded-2xl border border-[var(--glass-border)] p-6 md:p-8">
            {/* Custom bokeh — unique to this card, not from globals.css */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
                overflow: "hidden",
              }}
            >
              {/* blob 1 – dusty rose, top-right */}
              <span style={{
                position: "absolute",
                top: "-28%",
                right: "-6%",
                width: "52%",
                paddingTop: "52%",
                borderRadius: "9999px",
                background: "oklch(0.72 0.08 15 / 0.10)",
                filter: "blur(72px)",
                animation: "hero-bokeh-a 13s ease-in-out infinite",
              }} />
              {/* blob 2 – slate blue, bottom-left */}
              <span style={{
                position: "absolute",
                bottom: "-22%",
                left: "-6%",
                width: "46%",
                paddingTop: "46%",
                borderRadius: "9999px",
                background: "oklch(0.42 0.06 240 / 0.09)",
                filter: "blur(68px)",
                animation: "hero-bokeh-b 17s ease-in-out infinite",
              }} />
              {/* blob 3 – warm sand, center-right */}
              <span style={{
                position: "absolute",
                top: "25%",
                left: "40%",
                width: "34%",
                paddingTop: "34%",
                borderRadius: "9999px",
                background: "oklch(0.80 0.07 55 / 0.08)",
                filter: "blur(60px)",
                animation: "hero-bokeh-c 10s ease-in-out infinite",
              }} />
              <style>{`
                @keyframes hero-bokeh-a {
                  0%,100% { transform: translate(0,0) scale(1); }
                  40%      { transform: translate(-28px, 22px) scale(1.07); }
                  70%      { transform: translate(18px,-16px) scale(0.95); }
                }
                @keyframes hero-bokeh-b {
                  0%,100% { transform: translate(0,0) scale(1); }
                  35%      { transform: translate(22px,-18px) scale(1.06); }
                  65%      { transform: translate(-14px, 24px) scale(0.96); }
                }
                @keyframes hero-bokeh-c {
                  0%,100% { transform: translate(0,0) scale(1); }
                  50%      { transform: translate(16px, 20px) scale(1.10); }
                }
              `}</style>
            </span>

            {/* Content sits above the bokeh */}
            <div className="relative z-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sibling-accent)]">
                Digital dominance portfolio
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Own the narrative across models
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                This report merges your latest radar run, per-topic authority, bounty clusters, and GeoKnight
                rival consensus—so you can prioritize where to defend, generate, and compare.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/geo/geoknight"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--sibling-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--sibling-surface)] shadow-sm transition hover:opacity-95"
                >
                  Analyze market
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/80 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--glass-hover)] print:hidden"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="glass-card card-anime-float flex flex-col justify-center rounded-xl border border-[var(--glass-border)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active prompts
              </p>
              <p className="mt-2 font-heading text-4xl font-semibold tabular-nums text-foreground">
                {activePromptCount}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Across GeoKnight topics (active)</p>
            </div>
            <div className="glass-card card-anime-float flex flex-col justify-center rounded-xl border border-[var(--glass-border)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prompts tracked
              </p>
              <p className="mt-2 font-heading text-4xl font-semibold tabular-nums text-foreground">
                {promptsTracked || "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">With citation intelligence rows</p>
            </div>
          </div>
        </section>
      )}

      {/* Radar snapshot: dashboard metrics + recent trend sparklines + RadarCompareCharts below */}
      {hasRadarMetrics && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Radar snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ourName} · {latest?.calculatedAt ? new Date(latest.calculatedAt).toLocaleString() : "—"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "AI Share of Voice",
                value: formatMetric(latest?.shareOfVoice, { suffix: "%", digits: 1 }),
                note: "Relative mentions",
                spark: sparkSeries.sov,
                stroke: "var(--sibling-primary)",
              },
              {
                label: "Top-3 Mention Rate",
                value: formatMetric(latest?.top3Rate, { suffix: "%", digits: 0 }),
                note: `Benchmark ~${payload.top3BenchmarkPct}%`,
                spark: sparkSeries.top3,
                stroke: "var(--success)",
              },
              {
                label: "Query Coverage",
                value: formatMetric(latest?.queryCoverage, { suffix: "%", digits: 1 }),
                note: "Tracked queries",
                spark: sparkSeries.coverage,
                stroke: "var(--info)",
              },
              {
                label: "Rank vs competitors",
                value: `${formatMetric(latest?.competitorRank, { prefix: "#", digits: 1 })} vs ${formatMetric(latest?.avgRank, { prefix: "#", digits: 1 })}`,
                note: "Competitor vs avg",
                spark: sparkSeries.rank,
                stroke: "var(--sibling-accent)",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex flex-col rounded-lg bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-4"
              >
                <p className="text-[11px] font-semibold text-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.note}</p>
                <MiniSpark data={card.spark} stroke={card.stroke} />
              </div>
            ))}
          </div>
        </section>
      )}

      {hasRadarMetrics && (
        <div className="mt-8">
          <RadarCompareCharts
            base={{ sovSeries: payload.sovSeries, modelBreakdown: payload.modelBreakdown }}
            rivals={rivalsForCharts}
          />
        </div>
      )}

      {/* GeoKnight rival drill-down — only prompts where our company is present (regex match) */}
      {companyHighlightPrompts.length > 0 && (
        <section className="mt-8 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground font-heading md:text-base">
              Rival comparison highlights
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing prompts where <span className="font-semibold text-foreground">{ourName}</span> appears in
              consensus or per-model rows. Open GeoKnight for full simulations.
            </p>
          </div>
          {companyHighlightPrompts.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border)] bg-[var(--sibling-accent)]/90 px-4 py-3 text-[var(--sibling-surface)]">
                <p className="text-sm font-semibold truncate pr-2" title={p.query}>
                  {p.query}
                </p>
                <span className="text-[11px] opacity-90">{p.topicName}</span>
              </div>
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                <div className="border-b border-[var(--glass-border)]/70 p-4 lg:border-b-0 lg:border-r">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sibling-accent)]">
                    Rival consensus board
                  </p>
                  <ul className="mt-3 space-y-2 text-xs">
                    {(p.consensus ?? []).slice(0, 8).map((c, i) => (
                      <li
                        key={`${c.companyName}-${i}`}
                        className="rounded-md border border-[var(--glass-border)]/60 bg-background/30 px-2 py-1.5"
                      >
                        <span className="font-medium text-foreground">{c.companyName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · rank {c.avgRank != null ? `#${Number(c.avgRank).toFixed(1)}` : "—"} · mentions{" "}
                          {c.mentions}
                        </span>
                      </li>
                    ))}
                    {(p.consensus ?? []).length === 0 ? (
                      <li className="text-muted-foreground">No consensus rows yet.</li>
                    ) : null}
                  </ul>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sibling-accent)]">
                    Model duel board
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--glass-border)]">
                          <th className="text-left py-1.5 font-medium text-muted-foreground">Model</th>
                          <th className="text-left py-1.5 font-medium text-muted-foreground">Company</th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.byModel ?? []).slice(0, 12).map((row, i) => (
                          <tr key={`${row.model}-${row.companyName}-${i}`} className="border-b border-[var(--glass-border)]/35">
                            <td className="py-1.5">{row.model}</td>
                            <td className="py-1.5">{row.companyName}</td>
                            <td className="text-right tabular-nums py-1.5">
                              {row.rank != null ? `#${Number(row.rank).toFixed(1)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(p.byModel ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">No per-model rows yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--glass-border)] bg-[var(--sibling-accent)]/88 px-4 py-3 text-[12px] text-[var(--sibling-surface)]">
                <span className="font-semibold">Strategic pivot: </span>
                Tune prompts where consensus diverges from per-model ranks—then simulate responses in GeoKnight.
              </div>
            </div>
          ))}
          <div className="flex justify-end print:hidden">
            <Link
              href="/geo/geoknight"
              className="text-xs font-semibold text-[var(--sibling-primary)] hover:underline"
            >
              Open full GeoKnight →
            </Link>
          </div>
        </section>
      )}

      {/* Citation intelligence */}
      {hasIntel && (
        <section className="mt-8 glass-card card-anime-float rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground font-heading">Citation intelligence</h2>
          <p className="text-xs text-muted-foreground mt-1">Top 10 prompts by win rate (win % &gt; 0)</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  <th className="text-left py-2 font-medium text-muted-foreground">Prompt</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Runs</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Win %</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">WRS</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Models</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitationIntel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No rows match this search.
                    </td>
                  </tr>
                ) : (
                  filteredCitationIntel.map((row) => (
                    <tr key={row.promptId} className="border-b border-[var(--glass-border)]/50">
                      <td className="py-2 max-w-[260px] truncate" title={row.query}>
                        {row.query}
                      </td>
                      <td className="text-right py-2 tabular-nums">{row.executionCount}</td>
                      <td className="text-right py-2 tabular-nums">{row.winRate}%</td>
                      <td className="text-right py-2 tabular-nums">{row.wrs}</td>
                      <td className="text-right py-2 tabular-nums">
                        {row.modelsCitingCount}/{row.distinctModelTotal}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-foreground">Citation context mix</h3>
            {contextRows.length === 0 || (contextRows.length === 1 && contextRows[0]!.label === "unknown") ? (
              <p className="text-xs text-muted-foreground mt-1">Insufficient context labels — enrich citations upstream.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {contextRows.map((c) => (
                  <li
                    key={c.label}
                    className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/65 px-2 py-1 text-[11px]"
                  >
                    {c.label}: {c.pct}%
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      {(hasRadarContent || hasGeoKnightTopics) && (
        <section className="mt-12 rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass)] to-[var(--glass)]/70 p-8 text-center print:mt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground md:text-2xl">
            Ready to challenge a topic?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Jump into GeoKnight for simulations, refresh Company Radar for the latest microservice run, or open Bounty
            to hunt high-impact queries.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row print:hidden">
            <Link
              href="/geo/geoknight"
              className="inline-flex min-w-[200px] justify-center rounded-lg bg-[var(--sibling-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--sibling-surface)] shadow-sm hover:opacity-95"
            >
              Simulate topic duel
            </Link>
            <Link
              href="/geo/radar"
              className="inline-flex min-w-[200px] justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/90 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--glass-hover)]"
            >
              Company Radar
            </Link>
            <Link
              href="/geo/bounty"
              className="inline-flex min-w-[200px] justify-center rounded-lg bg-[var(--sibling-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            >
              Open Bounty
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

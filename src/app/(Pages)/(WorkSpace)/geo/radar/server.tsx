import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";
import { CitationsTable } from "./citations-table";
import { ModelBreakdownChart, SovTrendChart } from "./sov-charts";

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

function citationTypeLabel(query: string) {
  const q = query.toLowerCase();
  if (q.includes(" vs ") || q.includes("compare")) return "Comparison";
  if (q.includes("alternative")) return "Alternatives";
  if (q.includes("best") || q.includes("top")) return "Recommendations";
  if (q.includes("tool") || q.includes("platform") || q.includes("software")) return "Discovery";
  return "Citation";
}

export default async function RadarContent() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        Sign in as a company user to view Company Radar.
      </div>
    );
  }

  const [payload, ownCompanyCitations] = await Promise.all([
    buildRadarGetPayload(prisma, companyId),
    prisma.citation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        execution: {
          include: {
            prompt: { select: { query: true } },
          },
        },
      },
    }),
  ]);

  console.log(payload);
  
  const hasRadarMetrics = payload.metrics.length > 0;
  const hasIntel = payload.citationIntelligence.length > 0;
  const hasBounties = payload.bountyPriority.open.length > 0;

  if (!hasRadarMetrics && !hasIntel && !hasBounties) {
    return (
      <div className="rounded-xl glass-card card-anime-float p-6">
        <p className="text-sm text-muted-foreground">
          No radar data yet. Click <strong>Refresh data</strong> to fetch from the microservice, or add bounties / topic prompts.
        </p>
      </div>
    );
  }

  const ourName = payload.company?.name?.trim() ?? "Your company";
  const latest = payload.latest;

  const executionIds = Array.from(new Set(ownCompanyCitations.map((c) => c.executionId)));
  const executionCitations = executionIds.length
    ? await prisma.citation.findMany({
        where: { executionId: { in: executionIds } },
        select: { executionId: true, mentionedName: true, rank: true },
      })
    : [];

  const siblingsByExecution = new Map<string, Array<{ name: string; rank: number | null }>>();
  for (const cit of executionCitations) {
    const list = siblingsByExecution.get(cit.executionId) ?? [];
    list.push({ name: cit.mentionedName, rank: cit.rank });
    siblingsByExecution.set(cit.executionId, list);
  }

  const recentCitations = ownCompanyCitations.map((c) => {
    const siblings = (siblingsByExecution.get(c.executionId) ?? []).sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
    );
    return {
      id: c.id,
      prompt: c.execution.prompt.query,
      model: c.execution.model,
      rank: c.rank,
      type: citationTypeLabel(c.execution.prompt.query),
      companies: siblings,
    };
  });

  const contextAgg = new Map<string, number>();
  for (const row of payload.citationIntelligence) {
    for (const c of row.contextDistribution) {
      contextAgg.set(c.label, (contextAgg.get(c.label) ?? 0) + c.count);
    }
  }
  const ctxTotal = [...contextAgg.values()].reduce((a, b) => a + b, 0);
  const contextRows = [...contextAgg.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: ctxTotal > 0 ? Math.round((count / ctxTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <section className="glass-card card-anime-float rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground">Business summary</h2>
        <p className="mt-1 text-xs text-muted-foreground">Estimates use reach × conversion × AOV where data exists. Label is monthly-style.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Revenue at risk (est.)", value: formatUsd(payload.summaryCards.revenueAtRisk30d), note: "Low win / open exposure" },
            { label: "Revenue opportunity", value: formatUsd(payload.summaryCards.revenueOpportunity30d), note: "Top prompt picks" },
            { label: "Quick-win bounties", value: String(payload.summaryCards.quickWinsCount), note: "Easy + reach" },
            { label: "Published impact (30d)", value: formatUsd(payload.summaryCards.publishedImpact30d), note: "Hunted + published" },
            { label: "Model gaps", value: String(payload.summaryCards.modelGapCount), note: "Prompts missing models" },
            {
              label: "Avg hours to publish",
              value: payload.commerceLinkage.avgHoursToPublish != null ? `${payload.commerceLinkage.avgHoursToPublish}h` : "—",
              note: `${payload.commerceLinkage.timingSampleCount} samples`,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-4"
            >
              <p className="text-[11px] font-semibold text-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      {hasRadarMetrics ? (
        <section className="glass-card card-anime-float rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Radar snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ourName} · {latest?.calculatedAt ? new Date(latest.calculatedAt).toLocaleString() : "—"}
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "AI Share of Voice", value: formatMetric(latest?.shareOfVoice, { suffix: "%", digits: 1 }), note: "Relative mentions" },
              { label: "Top-3 Mention Rate", value: formatMetric(latest?.top3Rate, { suffix: "%", digits: 0 }), note: `Benchmark ~${payload.top3BenchmarkPct}%` },
              { label: "Query Coverage", value: formatMetric(latest?.queryCoverage, { suffix: "%", digits: 1 }), note: "Tracked queries" },
              { label: "Rank vs competitors", value: `${formatMetric(latest?.competitorRank, { prefix: "#", digits: 1 })} vs ${formatMetric(latest?.avgRank, { prefix: "#", digits: 1 })}`, note: "Competitor vs avg" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-4"
              >
                <p className="text-[11px] font-semibold text-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.note}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      
      {hasRadarMetrics ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card card-anime-float rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground">Share of voice trend</h3>
            <p className="text-xs text-muted-foreground mt-1">Recent radar runs</p>
            <div className="mt-2 h-[240px]">
              <SovTrendChart series={payload.sovSeries} />
            </div>
          </div>
          <div className="glass-card card-anime-float rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground">Model breakdown</h3>
            <p className="text-xs text-muted-foreground mt-1">Average SoV by model</p>
            <div className="mt-2 h-[240px]">
              <ModelBreakdownChart rows={payload.modelBreakdown} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="glass-card card-anime-float rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground">Citation intelligence</h2>
        <p className="text-xs text-muted-foreground mt-1">Sorted by lowest win rate first</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
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
              {payload.citationIntelligence.slice(0, 40).map((row) => (
                <tr key={row.promptId} className="border-b border-[var(--glass-border)]/50">
                  <td className="py-2 max-w-[240px] truncate" title={row.query}>
                    {row.query}
                  </td>
                  <td className="text-right py-2 tabular-nums">{row.executionCount}</td>
                  <td className="text-right py-2 tabular-nums">{row.winRate}%</td>
                  <td className="text-right py-2 tabular-nums">{row.wrs}</td>
                  <td className="text-right py-2 tabular-nums">
                    {row.modelsCitingCount}/{row.distinctModelTotal}
                  </td>
                </tr>
              ))}
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

      <section className="grid grid-cols-1 gap-4">
        <div className="glass-card card-anime-float rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Topic authority map</h2>
          <p className="text-xs text-muted-foreground mt-1">Quadrants from win rate × topic difficulty</p>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto glass-scrollbar">
            {payload.topicAuthorityMap.map((t) => (
              <div
                key={t.topicId}
                className="flex items-center justify-between rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2 text-xs"
              >
                <span className="font-medium truncate pr-2">{t.topicName}</span>
                <span className="text-muted-foreground shrink-0">
                  {t.difficulty} · {t.avgWinRate.toFixed(0)}% win ·{" "}
                  <span className="text-foreground capitalize">{t.quadrant.replace("_", " ")}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card card-anime-float rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground">Bounty priority</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Top 5 combined reach: {payload.bountyPriority.top5CombinedReach.toLocaleString()} · combined est. revenue:{" "}
          {formatUsd(payload.bountyPriority.top5CombinedEstimatedRevenue)}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th className="text-left py-2">Query</th>
                <th className="text-right py-2">Priority</th>
                <th className="text-right py-2">Reach</th>
                <th className="text-right py-2">Est. $/mo</th>
                <th className="text-left py-2">Cluster</th>
              </tr>
            </thead>
            <tbody>
              {payload.bountyPriority.open.slice(0, 15).map((b) => (
                <tr key={b.id} className="border-b border-[var(--glass-border)]/40">
                  <td className="py-2 max-w-xs truncate" title={b.query}>
                    {b.query}
                  </td>
                  <td className="text-right tabular-nums">{Math.round(b.priorityScore)}</td>
                  <td className="text-right tabular-nums">{b.estimatedReach ?? "—"}</td>
                  <td className="text-right tabular-nums">{formatUsd(b.estimatedRevenue)}</td>
                  <td className="py-2 text-muted-foreground">{b.suggestedCluster ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-foreground">By suggested cluster</h3>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            {payload.bountyPriority.clusters.slice(0, 8).map((c) => (
              <li key={c.suggestedCluster} className="rounded-md border border-[var(--glass-border)]/60 px-2 py-1.5">
                <span className="text-foreground font-medium">{c.suggestedCluster}</span> · {c.count} bounties · reach{" "}
                {c.sumReach} · est. {formatUsd(c.sumEstimatedRevenue)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="glass-card card-anime-float rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground">Action queue</h2>
        <p className="text-xs text-muted-foreground mt-1">Ranked by estimated revenue × opportunity</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th className="text-left py-2">Prompt</th>
                <th className="text-left py-2">Model</th>
                <th className="text-right py-2">Rank</th>
                <th className="text-right py-2">Est. $/mo</th>
                <th className="text-left py-2">Action</th>
                <th className="text-left py-2">CTA</th>
              </tr>
            </thead>
            <tbody>
              {payload.actionQueue.map((row) => (
                <tr key={`${row.promptId}-${row.model}`} className="border-b border-[var(--glass-border)]/40">
                  <td className="py-2 max-w-[200px] truncate" title={row.query}>
                    {row.query}
                  </td>
                  <td className="py-2">{row.model}</td>
                  <td className="text-right tabular-nums">
                    {row.isMentioned ? row.latestRank ?? "—" : "—"}
                  </td>
                  <td className="text-right tabular-nums">{formatUsd(row.estimatedRevenue)}</td>
                  <td className="py-2 capitalize">{row.actionType?.replace("_", " ") ?? "—"}</td>
                  <td className="py-2 font-mono text-[10px]">{row.recommendedCta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      < section className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-4">
        <div className="glass-card card-anime-float rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground">Recent citations</h3>
          <CitationsTable citations={recentCitations} ourCompanyName={ourName} />
        </div>
        <div className="glass-card card-anime-float rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Model history</h2>
          <p className="mt-1 text-xs text-muted-foreground">Recent radar metrics</p>
          <div className="mt-4 overflow-x-auto max-h-96 overflow-y-auto glass-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  <th className="text-left py-2 font-medium text-muted-foreground">Model</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">SoV</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Top 3</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Coverage</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Calculated</th>
                </tr>
              </thead>
              <tbody>
                {payload.metrics.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--glass-border)]/50">
                    <td className="py-2.5 font-medium text-foreground">{m.model}</td>
                    <td className="text-right py-2.5 tabular-nums">
                      {m.shareOfVoice != null ? `${m.shareOfVoice.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-2.5 tabular-nums">
                      {m.top3Rate != null ? `${m.top3Rate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-2.5 tabular-nums">
                      {m.queryCoverage != null ? `${m.queryCoverage.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-2.5 text-muted-foreground">
                      {new Date(m.calculatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

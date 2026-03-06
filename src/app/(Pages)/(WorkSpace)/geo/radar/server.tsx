import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CitationsTable } from "./citations-table";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMetric(
  value: number | null | undefined,
  opts: { suffix?: string; prefix?: string; digits?: number } = {}
) {
  const { suffix = "", prefix = "", digits = 1 } = opts;
  if (value == null || Number.isNaN(value)) return "—";
  return `${prefix}${Number(value).toFixed(digits)}${suffix}`;
}

function normalizePercentMetric(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
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

  const [metrics, company, brandEntity, ownCompanyCitations] = await Promise.all([
    prisma.llmRadarMetric.findMany({
      where: { companyId },
      orderBy: { calculatedAt: "desc" },
      take: 20,
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
    prisma.brandEntity.findUnique({
      where: { companyId },
      select: {
        topics: true,
        offerings: {
          select: {
            competitors: true,
          },
          where: { isActive: true },
          take: 3,
        },
      },
    }),
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

  const normalizedMetrics = metrics.map((m) => ({
    ...m,
    shareOfVoice: normalizePercentMetric(m.shareOfVoice),
    top3Rate: normalizePercentMetric(m.top3Rate),
    queryCoverage: normalizePercentMetric(m.queryCoverage),
  }));
  const latest =
    normalizedMetrics.find(
      (m) =>
        (m.shareOfVoice != null && m.shareOfVoice > 0) ||
        (m.top3Rate != null && m.top3Rate > 0) ||
        (m.queryCoverage != null && m.queryCoverage > 0) ||
        m.competitorRank != null ||
        m.topicAuthority != null
    ) ?? normalizedMetrics[0];

  if (metrics.length === 0) {
    return (
      <div className="rounded-xl glass-card card-anime-float p-6">
        <p className="text-sm text-muted-foreground">
          No radar data yet. Click <strong>Refresh data</strong> to fetch from the microservice.
        </p>
      </div>
    );
  }

  const ourName = company?.name?.trim() ?? "Your company";

  const executionIds = Array.from(
    new Set(ownCompanyCitations.map((c) => c.executionId).filter(Boolean))
  );
  const executionCitations = executionIds.length
    ? await prisma.citation.findMany({
        where: { executionId: { in: executionIds } },
        select: {
          executionId: true,
          mentionedName: true,
          rank: true,
        },
      })
    : [];

  const mentionMap = new Map<
    string,
    { mentions: number; rankSum: number; rankCount: number }
  >();
  for (const citation of executionCitations) {
    const key = citation.mentionedName.trim();
    if (!key) continue;
    const prev = mentionMap.get(key) ?? { mentions: 0, rankSum: 0, rankCount: 0 };
    prev.mentions += 1;
    if (citation.rank != null) {
      prev.rankSum += citation.rank;
      prev.rankCount += 1;
    }
    mentionMap.set(key, prev);
  }

  // Ensure our company exists in the landscape
  if (!mentionMap.has(ourName)) {
    mentionMap.set(ourName, { mentions: 1, rankSum: latest?.competitorRank ?? 3, rankCount: 1 });
  }

  // Fallback competitor names from brand identity if citations are sparse
  if (mentionMap.size < 3) {
    const fallbackCompetitors = (brandEntity?.offerings ?? [])
      .flatMap((o) => o.competitors ?? [])
      .filter(Boolean)
      .slice(0, 4);
    for (const name of fallbackCompetitors) {
      if (!mentionMap.has(name)) {
        mentionMap.set(name, { mentions: 1, rankSum: 4, rankCount: 1 });
      }
    }
  }

  const landscapeRaw = Array.from(mentionMap.entries()).map(([name, data]) => {
    const avgRank = data.rankCount ? data.rankSum / data.rankCount : 5;
    const authorityScore =
      name.toLowerCase() === ourName.toLowerCase()
        ? latest?.topicAuthority ?? 55
        : clamp(34 + data.mentions * 7 - avgRank * 3, 8, 94);
    return {
      name,
      mentions: data.mentions,
      avgRank,
      authorityScore,
      isOurCompany: name.toLowerCase() === ourName.toLowerCase(),
    };
  });

  const maxMentions = Math.max(...landscapeRaw.map((p) => p.mentions), 1);
  const landscapePoints = landscapeRaw
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 6)
    .map((point) => ({
      ...point,
      x: clamp(point.authorityScore, 8, 92),
      y: clamp((point.mentions / maxMentions) * 80 + 10, 12, 90),
    }));

  const ourPoint = landscapePoints.find((p) => p.isOurCompany);

  const topicNames = (brandEntity?.topics ?? [])
    .filter((t) => t.trim().length > 0)
    .slice(0, 3);
  const fallbackTopics = ["Brand visibility", "Category positioning", "Product comparisons"];
  const shownTopics = topicNames.length ? topicNames : fallbackTopics;
  const baseTopicScore = clamp(latest?.topicAuthority ?? 6.2, 3, 9.5);
  const topicScores = shownTopics.map((topic, i) => ({
    topic,
    score: clamp(baseTopicScore * (1 - i * 0.18), 2.2, 9.8),
  }));

  const siblingsByExecution = new Map<string, Array<{ name: string; rank: number | null }>>();
  for (const cit of executionCitations) {
    const list = siblingsByExecution.get(cit.executionId) ?? [];
    list.push({ name: cit.mentionedName, rank: cit.rank });
    siblingsByExecution.set(cit.executionId, list);
  }

  const recentCitations = ownCompanyCitations.map((c) => {
    const siblings = (siblingsByExecution.get(c.executionId) ?? [])
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return {
      id: c.id,
      prompt: c.execution.prompt.query,
      model: c.execution.model,
      rank: c.rank,
      type: citationTypeLabel(c.execution.prompt.query),
      companies: siblings,
    };
  });

  let positive = Math.round(clamp((latest?.top3Rate ?? 35) * 1.7, 32, 78));
  let negative = Math.round(clamp(18 - (latest?.queryCoverage ?? 25) * 0.2, 3, 18));
  let neutral = 100 - positive - negative;
  if (neutral < 8) {
    neutral = 8;
    positive = Math.max(24, 100 - negative - neutral);
  }
  negative = 100 - positive - neutral;

  return (
    <div className="space-y-6">
      <section className="glass-card card-anime-float rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground">Radar snapshot</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {company?.name} · {latest?.calculatedAt
            ? new Date(latest.calculatedAt).toLocaleString()
            : "—"}
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "AI Share of Voice",
              value: formatMetric(latest?.shareOfVoice, { suffix: "%", digits: 1 }),
              note: "Relative mentions",
            },
            {
              label: "Top-3 Mention Rate",
              value: formatMetric(latest?.top3Rate, { suffix: "%", digits: 0 }),
              note: "Appear in top 3",
            },
            {
              label: "Query Coverage",
              value: formatMetric(latest?.queryCoverage, { suffix: "%", digits: 1 }),
              note: "Queries cited",
            },
            {
              label: "Competitor Rank",
              value: formatMetric(latest?.competitorRank, { prefix: "#", digits: 1 }),
              note: "Avg position",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-lg bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-4">
              <p className="text-[11px] font-semibold text-foreground">{card.label}</p>
              <p className="mt-2 text-4xl font-semibold text-foreground tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-4">
        {/* Left column ~70% */}
        <div className="space-y-4">
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="glass-card card-anime-float rounded-xl p-4 xl:col-span-3">
              <h3 className="text-sm font-semibold text-foreground">Top Topics Authority</h3>
              <div className="mt-4 space-y-2">
                {topicScores.map((row) => (
                  <div
                    key={row.topic}
                    className="flex items-center justify-between rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/65 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-foreground truncate pr-2">{row.topic}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {row.score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card card-anime-float rounded-xl p-4 xl:col-span-6">
              <h3 className="text-sm font-semibold text-foreground">Competitor Landscape</h3>
              <div className="mt-4 relative h-72 rounded-lg border border-[var(--glass-border)]/70 bg-[var(--glass)]/40 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-55"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(21,29,53,0.08) 1px, transparent 1px), linear-gradient(to top, rgba(21,29,53,0.08) 1px, transparent 1px)",
                    backgroundSize: "20% 25%",
                  }}
                />

                {ourPoint ? (
                  <div
                    className="absolute w-36 h-36 rounded-full border border-dashed border-[var(--glass-border)]/80"
                    style={{
                      left: `${ourPoint.x}%`,
                      top: `${100 - ourPoint.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ) : null}

                {landscapePoints.map((point, idx) => {
                  const colors = [
                    "bg-amber-400",
                    "bg-sky-500",
                    "bg-indigo-500",
                    "bg-emerald-500",
                  ];
                  const pointColor = point.isOurCompany ? "bg-primary" : colors[idx % colors.length];
                  return (
                    <div
                      key={point.name}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${point.x}%`, top: `${100 - point.y}%` }}
                    >
                      <div
                        className={`h-3.5 w-3.5 rounded-full border border-white/70 shadow-sm ${pointColor}`}
                      />
                      <p className="mt-1 text-xs font-semibold text-foreground whitespace-nowrap">
                        {point.name}
                      </p>
                    </div>
                  );
                })}

                <p className="absolute left-3 bottom-2 text-[11px] text-muted-foreground">Topic Authority</p>
                <p className="absolute left-2 top-3 -rotate-90 origin-left text-[11px] text-muted-foreground">
                  Citation Frequency
                </p>
              </div>
            </div>

            <div className="glass-card card-anime-float rounded-xl p-4 xl:col-span-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Citations</h3>
              <CitationsTable citations={recentCitations} ourCompanyName={ourName} />
            </div>
          </section>

          <section className="glass-card card-anime-float rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground">Sentiment & Context</h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--glass-border)]/70">
              <div className="flex h-10 text-sm font-semibold tabular-nums text-white">
                <div className="bg-emerald-600 flex items-center justify-center" style={{ width: `${positive}%` }}>
                  {positive}%
                </div>
                <div className="bg-slate-500 flex items-center justify-center" style={{ width: `${neutral}%` }}>
                  {neutral}%
                </div>
                <div className="bg-red-500 flex items-center justify-center" style={{ width: `${negative}%` }}>
                  {negative}%
                </div>
              </div>
              <div className="grid grid-cols-3 text-[11px] text-muted-foreground border-t border-[var(--glass-border)]/60">
                <p className="px-3 py-1.5">Positive</p>
                <p className="px-3 py-1.5 text-center">Neutral</p>
                <p className="px-3 py-1.5 text-right">Negative</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right column ~30% */}
        <section className="glass-card card-anime-float rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Model History</h2>
          <p className="mt-1 text-xs text-muted-foreground">Recent radar runs by model</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  <th className="text-left py-2 font-medium text-muted-foreground">Model</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Share of voice</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Top 3 rate</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Query coverage</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Calculated</th>
                </tr>
              </thead>
              <tbody>
                {normalizedMetrics.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-hover)]/30">
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
        </section>
      </section>
    </div>
  );
}

import type { HighlightPrompt } from "./pick-highlight-prompts";
import {
  getReportPeriodBounds,
  formatReportPeriodLabel,
  isWithinReportPeriod,
} from "./report-period";
import { sanitizePdfText } from "./sanitize-pdf-text";
import {
  buildBrandFocusRegex,
  buildBrandMentionRows,
  formatCount,
  formatMetric,
  formatRankValue,
  sanitizeFiniteNumber,
} from "./report-utils";
import { promptMatchesCompanyFocus } from "@/lib/geo/geoknight/companyNameMatch";
import type { GeoKnightWorkspaceData } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";

type RadarPayload = Awaited<
  ReturnType<typeof import("@/lib/geo/radar/buildRadarGetPayload").buildRadarGetPayload>
>;

type RadarMetricRow = RadarPayload["metrics"][number];

export type ReportDocumentMetric = {
  label: string;
  value: string;
  note: string;
};

export type ReportDocumentBrandMention = {
  query: string;
  topicName: string;
  topicDifficulty: string;
  consensusRank: string;
  modelRank: string;
  otherBrands: string;
};

export type ReportDocumentRivalHighlight = {
  query: string;
  topicName: string;
  consensus: Array<{ companyName: string; rank: string; mentions: string }>;
  byModel: Array<{ model: string; companyName: string; rank: string }>;
};

export type ReportDocumentBountyPage = {
  pageTitle: string;
  query: string;
};

export type ReportDocumentData = {
  companyName: string;
  generatedAt: string;
  reportPeriodLabel: string;
  activePromptCount: number;
  promptsTracked: number;
  radarCalculatedAt: string | null;
  metrics: ReportDocumentMetric[];
  brandMentions: ReportDocumentBrandMention[];
  rivalHighlights: ReportDocumentRivalHighlight[];
  bountyPages: ReportDocumentBountyPage[];
  hasData: boolean;
};

function formatOtherBrands(
  brands: Array<{ companyName: string; bestRank: number | null }>
): string {
  if (brands.length === 0) return "No other brands in rival rows.";
  return brands
    .map((b) => `${b.companyName} (${formatRankValue(b.bestRank)})`)
    .join("; ");
}

function filterGeoKnightByPromptPeriod(
  geoKnight: GeoKnightWorkspaceData,
  bounds: { start: Date; end: Date }
): GeoKnightWorkspaceData {
  return {
    ...geoKnight,
    topicViews: geoKnight.topicViews
      .map((topic) => ({
        ...topic,
        prompts: topic.prompts.filter((p) => isWithinReportPeriod(p.createdAt, bounds)),
      }))
      .filter((t) => t.prompts.length > 0),
  };
}

function filterMetricsInPeriod(
  metrics: RadarMetricRow[],
  bounds: { start: Date; end: Date }
): RadarMetricRow[] {
  return metrics.filter((m) => isWithinReportPeriod(m.calculatedAt, bounds));
}

function pickLatestMetricInPeriod(metrics: RadarMetricRow[]): RadarMetricRow | null {
  if (metrics.length === 0) return null;
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
  );
  return (
    sorted.find(
      (m) =>
        (m.shareOfVoice != null && m.shareOfVoice > 0) ||
        (m.top3Rate != null && m.top3Rate > 0) ||
        (m.queryCoverage != null && m.queryCoverage > 0) ||
        m.competitorRank != null ||
        m.topicAuthority != null
    ) ?? sorted[0]!
  );
}

function collectPromptIdsInPeriod(
  geoKnight: GeoKnightWorkspaceData,
  bounds: { start: Date; end: Date }
): Set<string> {
  const ids = new Set<string>();
  for (const topic of geoKnight.topicViews) {
    for (const prompt of topic.prompts) {
      if (isWithinReportPeriod(prompt.createdAt, bounds)) {
        ids.add(prompt.id);
      }
    }
  }
  return ids;
}

export function buildReportDocumentData(input: {
  payload: RadarPayload;
  geoKnight: GeoKnightWorkspaceData;
  bountyPages: Array<{ pageTitle: string; query: string; createdAt: string }>;
  highlightPrompts: HighlightPrompt[];
}): ReportDocumentData {
  const { payload, geoKnight, bountyPages, highlightPrompts } = input;
  const periodBounds = getReportPeriodBounds();
  const reportPeriodLabel = formatReportPeriodLabel(periodBounds);

  const geoKnightInPeriod = filterGeoKnightByPromptPeriod(geoKnight, periodBounds);
  const promptIdsInPeriod = collectPromptIdsInPeriod(geoKnight, periodBounds);

  const ourName = payload.company?.name?.trim() ?? "Your company";
  const metricsInPeriod = filterMetricsInPeriod(payload.metrics, periodBounds);
  const latestMetric = pickLatestMetricInPeriod(metricsInPeriod);
  const brandFocusRegex = buildBrandFocusRegex(geoKnightInPeriod, ourName);

  const activePromptCount = geoKnightInPeriod.topicViews.reduce(
    (s, t) => s + t.prompts.length,
    0
  );
  const promptsTracked = payload.citationIntelligence.filter((c) =>
    promptIdsInPeriod.has(c.promptId)
  ).length;

  const brandMentionRows = buildBrandMentionRows(geoKnightInPeriod, brandFocusRegex);

  const companyHighlightPrompts = highlightPrompts.filter(
    (p) =>
      isWithinReportPeriod(p.createdAt, periodBounds) &&
      (brandFocusRegex ? promptMatchesCompanyFocus(p, brandFocusRegex) : false)
  );

  const metrics: ReportDocumentMetric[] = [
    {
      label: "AI Share of Voice",
      value: formatMetric(latestMetric?.shareOfVoice, { suffix: "%", digits: 1 }),
      note: "Relative mentions",
    },
    {
      label: "Top-3 Mention Rate",
      value: formatMetric(latestMetric?.top3Rate, { suffix: "%", digits: 0 }),
      note: `Benchmark ~${formatCount(payload.top3BenchmarkPct)}%`,
    },
    {
      label: "Query Coverage",
      value: formatMetric(latestMetric?.queryCoverage, { suffix: "%", digits: 1 }),
      note: "Tracked queries",
    },
    {
      label: "Rank vs competitors",
      value: `${formatMetric(latestMetric?.competitorRank, { prefix: "#", digits: 1 })} vs ${formatMetric(latestMetric?.avgRank, { prefix: "#", digits: 1 })}`,
      note: "Competitor vs avg",
    },
  ];

  const bountyPagesInPeriod = bountyPages.filter((b) =>
    isWithinReportPeriod(b.createdAt, periodBounds)
  );

  const hasRadarMetrics = metricsInPeriod.length > 0;
  const hasGeoKnightTopics = geoKnightInPeriod.topicViews.length > 0;
  const hasGeneratedBountyPages = bountyPagesInPeriod.length > 0;
  const hasData =
    hasRadarMetrics ||
    promptsTracked > 0 ||
    hasGeneratedBountyPages ||
    hasGeoKnightTopics ||
    brandMentionRows.length > 0 ||
    companyHighlightPrompts.length > 0;

  return {
    companyName: sanitizePdfText(ourName, 120),
    generatedAt: new Date().toISOString(),
    reportPeriodLabel: sanitizePdfText(reportPeriodLabel),
    activePromptCount: sanitizeFiniteNumber(activePromptCount, { min: 0, max: 1e6 }) ?? 0,
    promptsTracked: sanitizeFiniteNumber(promptsTracked, { min: 0, max: 1e6 }) ?? 0,
    radarCalculatedAt: latestMetric?.calculatedAt
      ? sanitizePdfText(new Date(latestMetric.calculatedAt).toLocaleString())
      : null,
    metrics: hasRadarMetrics
      ? metrics.map((m) => ({
          label: sanitizePdfText(m.label),
          value: sanitizePdfText(m.value),
          note: sanitizePdfText(m.note),
        }))
      : [],
    brandMentions: brandMentionRows.map((row) => ({
      query: sanitizePdfText(row.query),
      topicName: sanitizePdfText(row.topicName),
      topicDifficulty: sanitizePdfText(row.topicDifficulty),
      consensusRank: formatRankValue(row.consensusBest),
      modelRank: formatRankValue(row.modelBest),
      otherBrands: formatOtherBrands(row.otherBrands),
    })),
    rivalHighlights: companyHighlightPrompts.map((p) => ({
      query: sanitizePdfText(p.query),
      topicName: sanitizePdfText(p.topicName),
      consensus: (p.consensus ?? []).map((c) => ({
        companyName: sanitizePdfText(c.companyName, 200),
        rank: formatRankValue(c.avgRank),
        mentions: formatCount(c.mentions),
      })),
      byModel: (p.byModel ?? []).map((row) => ({
        model: sanitizePdfText(row.model, 80),
        companyName: sanitizePdfText(row.companyName, 200),
        rank: formatRankValue(row.rank),
      })),
    })),
    bountyPages: bountyPagesInPeriod.map((b) => ({
      pageTitle: sanitizePdfText(b.pageTitle),
      query: sanitizePdfText(b.query),
    })),
    hasData,
  };
}

export function slugifyForFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "report"
  );
}

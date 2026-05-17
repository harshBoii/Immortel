import type { HighlightPrompt } from "./pick-highlight-prompts";
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

export function buildReportDocumentData(input: {
  payload: RadarPayload;
  geoKnight: GeoKnightWorkspaceData;
  bountyPages: Array<{ pageTitle: string; query: string }>;
  highlightPrompts: HighlightPrompt[];
}): ReportDocumentData {
  const { payload, geoKnight, bountyPages, highlightPrompts } = input;
  const ourName = payload.company?.name?.trim() ?? "Your company";
  const latest = payload.latest;
  const brandFocusRegex = buildBrandFocusRegex(geoKnight, ourName);

  const activePromptCount = geoKnight.topicViews.reduce(
    (s, t) => s + t.prompts.length,
    0
  );
  const promptsTracked = payload.citationIntelligence.length;

  const brandMentionRows = buildBrandMentionRows(geoKnight, brandFocusRegex);

  const companyHighlightPrompts = highlightPrompts.filter((p) =>
    brandFocusRegex ? promptMatchesCompanyFocus(p, brandFocusRegex) : false
  );

  const metrics: ReportDocumentMetric[] = [
    {
      label: "AI Share of Voice",
      value: formatMetric(latest?.shareOfVoice, { suffix: "%", digits: 1 }),
      note: "Relative mentions",
    },
    {
      label: "Top-3 Mention Rate",
      value: formatMetric(latest?.top3Rate, { suffix: "%", digits: 0 }),
      note: `Benchmark ~${formatCount(payload.top3BenchmarkPct)}%`,
    },
    {
      label: "Query Coverage",
      value: formatMetric(latest?.queryCoverage, { suffix: "%", digits: 1 }),
      note: "Tracked queries",
    },
    {
      label: "Rank vs competitors",
      value: `${formatMetric(latest?.competitorRank, { prefix: "#", digits: 1 })} vs ${formatMetric(latest?.avgRank, { prefix: "#", digits: 1 })}`,
      note: "Competitor vs avg",
    },
  ];

  const hasRadarMetrics = payload.metrics.length > 0;
  const hasGeoKnightTopics = geoKnight.topicViews.length > 0;
  const hasGeneratedBountyPages = bountyPages.length > 0;
  const hasData =
    hasRadarMetrics ||
    payload.citationIntelligence.length > 0 ||
    payload.bountyPriority.open.length > 0 ||
    hasGeneratedBountyPages ||
    hasGeoKnightTopics;

  return {
    companyName: sanitizePdfText(ourName, 120),
    generatedAt: new Date().toISOString(),
    activePromptCount: sanitizeFiniteNumber(activePromptCount, { min: 0, max: 1e6 }) ?? 0,
    promptsTracked: sanitizeFiniteNumber(promptsTracked, { min: 0, max: 1e6 }) ?? 0,
    radarCalculatedAt: latest?.calculatedAt
      ? sanitizePdfText(new Date(latest.calculatedAt).toLocaleString())
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
    bountyPages: bountyPages.map((b) => ({
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

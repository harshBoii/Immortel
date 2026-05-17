import type { HighlightPrompt } from "./pick-highlight-prompts";
import {
  buildBrandFocusRegex,
  buildBrandMentionRows,
  formatMetric,
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
  consensus: Array<{ companyName: string; rank: string; mentions: number }>;
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

function formatRank(rank: number | null): string {
  return rank != null ? `#${Number(rank).toFixed(1)}` : "—";
}

function formatOtherBrands(
  brands: Array<{ companyName: string; bestRank: number | null }>
): string {
  if (brands.length === 0) return "No other brands in rival rows.";
  return brands
    .map((b) =>
      b.bestRank != null
        ? `${b.companyName} (${formatRank(b.bestRank)})`
        : `${b.companyName} (—)`
    )
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
      note: `Benchmark ~${payload.top3BenchmarkPct}%`,
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
    companyName: ourName,
    generatedAt: new Date().toISOString(),
    activePromptCount,
    promptsTracked,
    radarCalculatedAt: latest?.calculatedAt
      ? new Date(latest.calculatedAt).toLocaleString()
      : null,
    metrics: hasRadarMetrics ? metrics : [],
    brandMentions: brandMentionRows.map((row) => ({
      query: row.query,
      topicName: row.topicName,
      topicDifficulty: row.topicDifficulty,
      consensusRank: formatRank(row.consensusBest),
      modelRank: formatRank(row.modelBest),
      otherBrands: formatOtherBrands(row.otherBrands),
    })),
    rivalHighlights: companyHighlightPrompts.map((p) => ({
      query: p.query,
      topicName: p.topicName,
      consensus: (p.consensus ?? []).map((c) => ({
        companyName: c.companyName,
        rank: formatRank(c.avgRank),
        mentions: c.mentions,
      })),
      byModel: (p.byModel ?? []).map((row) => ({
        model: row.model,
        companyName: row.companyName,
        rank: formatRank(row.rank),
      })),
    })),
    bountyPages: bountyPages.map((b) => ({
      pageTitle: b.pageTitle,
      query: b.query,
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

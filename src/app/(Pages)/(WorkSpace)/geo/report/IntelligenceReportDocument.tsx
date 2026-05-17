import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { ReportDocumentData } from "./build-report-document-data";
import { chunkArray, sanitizePdfText } from "./sanitize-pdf-text";

const PAGE_PADDING = 40;
const BRAND_MENTIONS_PER_PAGE = 18;

const s = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  muted: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 10,
  },
  block: {
    marginBottom: 10,
  },
  metricLine: {
    fontSize: 10,
    marginBottom: 4,
  },
  card: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },
  label: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 2,
  },
});

function Block({ children }: { children: ReactNode }) {
  return <View style={s.block}>{children}</View>;
}

function MetricLines({ metrics }: { metrics: ReportDocumentData["metrics"] }) {
  if (metrics.length === 0) return null;
  return (
    <Block>
      <Text style={s.h2}>Radar snapshot</Text>
      {metrics.map((m) => (
        <Text key={m.label} style={s.metricLine}>
          {sanitizePdfText(m.label)}: {sanitizePdfText(m.value)} — {sanitizePdfText(m.note)}
        </Text>
      ))}
    </Block>
  );
}

function BrandMentionItem({
  row,
}: {
  row: ReportDocumentData["brandMentions"][number];
}) {
  return (
    <View style={s.card}>
      <Text style={s.h3}>{sanitizePdfText(row.query)}</Text>
      <Text style={s.muted}>
        {sanitizePdfText(row.topicName)} · {sanitizePdfText(row.topicDifficulty)} · consensus{" "}
        {sanitizePdfText(row.consensusRank)} · model {sanitizePdfText(row.modelRank)}
      </Text>
      <Text style={{ fontSize: 9 }}>Rivals: {sanitizePdfText(row.otherBrands, 1500)}</Text>
    </View>
  );
}

function RivalHighlightItem({
  highlight,
}: {
  highlight: ReportDocumentData["rivalHighlights"][number];
}) {
  return (
    <View style={s.card}>
      <Text style={s.h3}>{sanitizePdfText(highlight.query)}</Text>
      <Text style={s.muted}>{sanitizePdfText(highlight.topicName)}</Text>
      <Text style={[s.label, { marginTop: 6 }]}>Rival consensus</Text>
      {highlight.consensus.length === 0 ? (
        <Text style={{ fontSize: 9 }}>No consensus rows yet.</Text>
      ) : (
        highlight.consensus.map((c, i) => (
          <Text key={`c-${i}`} style={{ fontSize: 9, marginBottom: 2 }}>
            {sanitizePdfText(c.companyName)} · rank {sanitizePdfText(c.rank)} · mentions{" "}
            {sanitizePdfText(c.mentions)}
          </Text>
        ))
      )}
      <Text style={[s.label, { marginTop: 6 }]}>Model duel</Text>
      {highlight.byModel.length === 0 ? (
        <Text style={{ fontSize: 9 }}>No per-model rows yet.</Text>
      ) : (
        highlight.byModel.map((row, i) => (
          <Text key={`m-${i}`} style={{ fontSize: 9, marginBottom: 2 }}>
            {sanitizePdfText(row.model)} · {sanitizePdfText(row.companyName)} ·{" "}
            {sanitizePdfText(row.rank)}
          </Text>
        ))
      )}
    </View>
  );
}

export function IntelligenceReportDocument({ data }: { data: ReportDocumentData }) {
  const company = sanitizePdfText(data.companyName, 120);
  const generatedLabel = sanitizePdfText(
    new Date(data.generatedAt).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    })
  );
  const brandChunks = chunkArray(data.brandMentions, BRAND_MENTIONS_PER_PAGE);

  return (
    <Document
      title={`Intelligence Report — ${company}`}
      author="Immortell"
      subject="GEO Intelligence Report"
    >
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 9, color: "#666666", marginBottom: 24 }}>IMMORTELL</Text>
        <Text style={s.h1}>Intelligence Report</Text>
        <Text style={[s.muted, { fontSize: 11, marginBottom: 20 }]}>
          Consolidated radar metrics, topic authority, and GeoKnight rival signals for {company}.
        </Text>
        <Text style={s.muted}>Generated {generatedLabel}</Text>
      </Page>

      {/* Summary + metrics */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Executive summary</Text>
        <Text style={s.muted}>
          Overview of active prompt coverage and citation intelligence tracking.
        </Text>
        <Text style={s.metricLine}>
          Active prompts: {String(data.activePromptCount)} (across GeoKnight topics)
        </Text>
        <Text style={s.metricLine}>
          Prompts tracked:{" "}
          {data.promptsTracked > 0 ? String(data.promptsTracked) : "—"} (citation intelligence
          rows)
        </Text>

        {!data.hasData ? (
          <Text style={[s.muted, { marginTop: 16 }]}>
            No intelligence data yet. Run Refresh data on Company Radar and add topics in
            GeoKnight.
          </Text>
        ) : null}

        {data.radarCalculatedAt ? (
          <Text style={[s.muted, { marginTop: 8 }]}>
            Latest radar run: {sanitizePdfText(data.radarCalculatedAt)}
          </Text>
        ) : null}

        <MetricLines metrics={data.metrics} />
      </Page>

      {/* Brand mentions — paginated */}
      {brandChunks.map((chunk, pageIdx) => (
        <Page key={`brand-${pageIdx}`} size="A4" style={s.page}>
          <Text style={s.h2}>Brand mentions in prompts</Text>
          <Text style={s.muted}>
            {pageIdx === 0
              ? `All prompts where ${company} appears in rival rows (${data.brandMentions.length} total).`
              : `Continued (${pageIdx + 1} of ${brandChunks.length}).`}
          </Text>
          {chunk.map((row, i) => (
            <BrandMentionItem key={`${pageIdx}-${i}-${row.query}`} row={row} />
          ))}
        </Page>
      ))}

      {/* Rival highlights — one block per page to avoid overflow */}
      {data.rivalHighlights.map((highlight, idx) => (
        <Page key={`rival-${idx}`} size="A4" style={s.page}>
          {idx === 0 ? (
            <View>
              <Text style={s.h2}>Rival comparison highlights</Text>
              <Text style={s.muted}>
                Prompts where {company} appears in consensus or per-model rows.
              </Text>
            </View>
          ) : null}
          <RivalHighlightItem highlight={highlight} />
        </Page>
      ))}

      {/* Bounty pages */}
      {data.bountyPages.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Text style={s.h2}>Generated bounty pages</Text>
          <Text style={s.muted}>
            AEO pages linked from hunted bounties ({data.bountyPages.length} pages).
          </Text>
          {data.bountyPages.map((row, i) => (
            <View key={`bounty-${i}`} style={s.card}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>
                {sanitizePdfText(row.pageTitle)}
              </Text>
              <Text style={s.muted}>{sanitizePdfText(row.query)}</Text>
            </View>
          ))}
        </Page>
      ) : null}
    </Document>
  );
}

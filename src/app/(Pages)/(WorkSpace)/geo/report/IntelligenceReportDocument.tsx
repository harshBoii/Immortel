import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportDocumentData } from "./build-report-document-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.45,
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
  },
  coverBrand: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 360,
  },
  coverMeta: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#888",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    marginTop: 8,
  },
  sectionDesc: {
    fontSize: 9,
    color: "#555",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 2,
  },
  summaryLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#ccc",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    flex: 1,
    fontSize: 9,
  },
  cellWide: {
    flex: 2,
    fontSize: 9,
  },
  cellNarrow: {
    width: 72,
    fontSize: 9,
  },
  headerCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#444",
  },
  highlightBlock: {
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  highlightHeader: {
    backgroundColor: "#2d2d2d",
    color: "#fff",
    padding: 10,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  highlightTopic: {
    fontSize: 8,
    color: "#ccc",
    marginTop: 2,
  },
  highlightBody: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  highlightCol: {
    flex: 1,
    padding: 10,
    borderRightWidth: 0.5,
    borderRightColor: "#e8e8e8",
  },
  highlightColLast: {
    borderRightWidth: 0,
  },
  subheading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#444",
    marginBottom: 6,
  },
  listItem: {
    fontSize: 8,
    marginBottom: 4,
    color: "#333",
  },
  emptyNote: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
    marginTop: 24,
    textAlign: "center",
  },
});

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>Immortell · Intelligence Report</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function MetricsTable({ metrics }: { metrics: ReportDocumentData["metrics"] }) {
  if (metrics.length === 0) return null;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.headerCell]}>Metric</Text>
        <Text style={[styles.cellNarrow, styles.headerCell]}>Value</Text>
        <Text style={[styles.cell, styles.headerCell]}>Notes</Text>
      </View>
      {metrics.map((m, i) => (
        <View
          key={m.label}
          style={[
            styles.tableRow,
            i === metrics.length - 1 ? styles.tableRowLast : {},
          ]}
        >
          <Text style={styles.cell}>{m.label}</Text>
          <Text style={[styles.cellNarrow, { fontFamily: "Helvetica-Bold" }]}>{m.value}</Text>
          <Text style={styles.cell}>{m.note}</Text>
        </View>
      ))}
    </View>
  );
}

function BrandMentionsTable({
  rows,
}: {
  rows: ReportDocumentData["brandMentions"];
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cellWide, styles.headerCell]}>Prompt</Text>
        <Text style={[styles.cell, styles.headerCell]}>Topic</Text>
        <Text style={[styles.cellNarrow, styles.headerCell]}>Diff.</Text>
        <Text style={[styles.cellNarrow, styles.headerCell]}>Ranks</Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={`${row.query}-${i}`}
          style={[
            styles.tableRow,
            { flexDirection: "column", alignItems: "stretch" },
            i === rows.length - 1 ? styles.tableRowLast : {},
          ]}
          wrap={false}
        >
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.cellWide}>{row.query}</Text>
            <Text style={styles.cell}>{row.topicName}</Text>
            <Text style={styles.cellNarrow}>{row.topicDifficulty}</Text>
            <Text style={styles.cellNarrow}>
              {row.consensusRank} / {row.modelRank}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: "#555", marginTop: 4, paddingHorizontal: 8 }}>
            Rivals: {row.otherBrands}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function IntelligenceReportDocument({ data }: { data: ReportDocumentData }) {
  const generatedLabel = new Date(data.generatedAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <Document
      title={`Intelligence Report — ${data.companyName}`}
      author="Immortell"
      subject="GEO Intelligence Report"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverBrand}>Immortell</Text>
          <Text style={styles.coverTitle}>Intelligence Report</Text>
          <Text style={styles.coverSubtitle}>
            Consolidated radar metrics, topic authority, and GeoKnight rival signals for{" "}
            {data.companyName}.
          </Text>
          <Text style={styles.coverMeta}>Generated {generatedLabel}</Text>
        </View>
        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive summary</Text>
        <Text style={styles.sectionDesc}>
          Overview of active prompt coverage and citation intelligence tracking.
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Active prompts</Text>
            <Text style={styles.summaryValue}>{data.activePromptCount}</Text>
            <Text style={{ fontSize: 8, color: "#666", marginTop: 4 }}>
              Across GeoKnight topics
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Prompts tracked</Text>
            <Text style={styles.summaryValue}>
              {data.promptsTracked > 0 ? data.promptsTracked : "—"}
            </Text>
            <Text style={{ fontSize: 8, color: "#666", marginTop: 4 }}>
              With citation intelligence rows
            </Text>
          </View>
        </View>

        {!data.hasData ? (
          <Text style={styles.emptyNote}>
            No intelligence data yet. Run Refresh data on Company Radar and add topics in
            GeoKnight.
          </Text>
        ) : null}

        {data.metrics.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Radar snapshot</Text>
            <Text style={styles.sectionDesc}>
              {data.companyName}
              {data.radarCalculatedAt ? ` · ${data.radarCalculatedAt}` : ""}
            </Text>
            <MetricsTable metrics={data.metrics} />
          </>
        ) : null}

        <PageFooter />
      </Page>

      {data.brandMentions.length > 0 ? (
        <Page size="A4" style={styles.page} wrap>
          <Text style={styles.sectionTitle}>Brand mentions in prompts</Text>
          <Text style={styles.sectionDesc}>
            All GeoKnight prompts where {data.companyName} appears in consensus or per-model
            rival rows ({data.brandMentions.length} prompts).
          </Text>
          <BrandMentionsTable rows={data.brandMentions} />
          <PageFooter />
        </Page>
      ) : null}

      {data.rivalHighlights.length > 0
        ? data.rivalHighlights.map((highlight, idx) => (
            <Page key={`${highlight.query}-${idx}`} size="A4" style={styles.page} wrap>
              {idx === 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Rival comparison highlights</Text>
                  <Text style={styles.sectionDesc}>
                    Prompts where {data.companyName} appears in consensus or per-model rows.
                  </Text>
                </>
              ) : null}
              <View style={styles.highlightBlock} wrap={false}>
                <View style={styles.highlightHeader}>
                  <Text>{highlight.query}</Text>
                  <Text style={styles.highlightTopic}>{highlight.topicName}</Text>
                </View>
                <View style={styles.highlightBody}>
                  <View style={styles.highlightCol}>
                    <Text style={styles.subheading}>Rival consensus board</Text>
                    {highlight.consensus.length === 0 ? (
                      <Text style={styles.listItem}>No consensus rows yet.</Text>
                    ) : (
                      highlight.consensus.map((c, i) => (
                        <Text key={`c-${i}`} style={styles.listItem}>
                          {c.companyName} · rank {c.rank} · mentions {c.mentions}
                        </Text>
                      ))
                    )}
                  </View>
                  <View style={[styles.highlightCol, styles.highlightColLast]}>
                    <Text style={styles.subheading}>Model duel board</Text>
                    {highlight.byModel.length === 0 ? (
                      <Text style={styles.listItem}>No per-model rows yet.</Text>
                    ) : (
                      highlight.byModel.map((row, i) => (
                        <Text key={`m-${i}`} style={styles.listItem}>
                          {row.model} · {row.companyName} · {row.rank}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              </View>
              <PageFooter />
            </Page>
          ))
        : null}

      {data.bountyPages.length > 0 ? (
        <Page size="A4" style={styles.page} wrap>
          <Text style={styles.sectionTitle}>Generated bounty pages</Text>
          <Text style={styles.sectionDesc}>
            AEO pages linked from hunted bounties ({data.bountyPages.length} pages).
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell]}>Page title</Text>
              <Text style={[styles.cell, styles.headerCell]}>Bounty query</Text>
            </View>
            {data.bountyPages.map((row, i) => (
              <View
                key={`${row.pageTitle}-${i}`}
                style={[
                  styles.tableRow,
                  i === data.bountyPages.length - 1 ? styles.tableRowLast : {},
                ]}
              >
                <Text style={styles.cell}>{row.pageTitle}</Text>
                <Text style={styles.cell}>{row.query}</Text>
              </View>
            ))}
          </View>
          <PageFooter />
        </Page>
      ) : null}
    </Document>
  );
}

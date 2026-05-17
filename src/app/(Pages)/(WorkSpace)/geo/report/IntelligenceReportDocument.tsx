import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { ReportDocumentData } from "./build-report-document-data";
import { chunkArray, sanitizePdfText } from "./sanitize-pdf-text";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_PADDING = 40;
const BRAND_MENTIONS_PER_PAGE = 18;

// Built-ins used (zero registration needed):
// Times-Bold, Times-Roman, Times-Italic  → display, body, muted text
// Helvetica-Bold, Helvetica              → UI labels / headers / tags
// Courier, Courier-Bold                  → code / schema blocks

// ─── Palette ─────────────────────────────────────────────────────────────────
const ACCENT       = "#0f4c5c";
const ACCENT_LIGHT = "#e8f4f6";
const RULE_COLOR   = "#e2e2e2";
const MUTED_COLOR  = "#6b6b6b";
const FAINT_COLOR  = "#999999";
const TEXT_COLOR   = "#1a1a1a";

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // Page shell — interior pages (cover overrides padding via coverPage)
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: TEXT_COLOR,
    lineHeight: 1.55,
  },

  // Scrollable body area — pushed below the fixed 40px header
  pageBody: {
    marginTop: 48,
    flex: 1,
  },

  // ── Running header (fixed, repeats every page) ──────────────────────────
  pageHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_PADDING,
  },
  pageHeaderBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  pageHeaderTitle: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "rgba(255,255,255,0.65)",
  },

  // ── Footer (fixed, repeats every page) ──────────────────────────────────
  pageFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 14,
  },
  pageFooterRule: {
    height: 1,
    backgroundColor: RULE_COLOR,
    marginBottom: 6,
  },
  pageFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooterLeft: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: FAINT_COLOR,
  },
  pageFooterRight: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: FAINT_COLOR,
  },

  // ── Cover page ────────────────────────────────────────────────────────────
  coverPage: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: TEXT_COLOR,
  },
  coverBand: {
    backgroundColor: ACCENT,
    height: 210,
    justifyContent: "flex-end",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 28,
  },
  coverBrandmark: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  coverBandRule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 14,
  },
  coverBandTagline: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
  },
  coverBody: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 40,
    flex: 1,
  },
  coverEyebrow: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: "Times-Bold",      // was EBGaramond 700
    color: TEXT_COLOR,
    lineHeight: 1.15,
    marginBottom: 4,
  },
  coverCompany: {
    fontSize: 20,
    fontFamily: "Times-Italic",    // was EBGaramond italic
    color: ACCENT,
    marginBottom: 20,
  },
  coverRule: {
    height: 3,
    width: 56,
    backgroundColor: ACCENT,
    marginBottom: 18,
  },
  coverSub: {
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: MUTED_COLOR,
    lineHeight: 1.6,
    maxWidth: 380,
    marginBottom: 36,
  },
  coverFooter: {
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: RULE_COLOR,
    paddingTop: 14,
  },
  coverFooterText: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: FAINT_COLOR,
    marginBottom: 3,
  },

  // ── Section break page ────────────────────────────────────────────────────
  sectionBreakBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: 56,
  },
  sectionBreakNumber: {
    fontSize: 100,
    fontFamily: "Times-Bold",      // was EBGaramond 400
    color: ACCENT_LIGHT,
    lineHeight: 1,
    marginBottom: -10,
  },
  sectionBreakRule: {
    height: 3,
    width: 64,
    backgroundColor: ACCENT,
    marginBottom: 18,
  },
  sectionBreakTitle: {
    fontSize: 28,
    fontFamily: "Times-Bold",      // was EBGaramond 700
    color: TEXT_COLOR,
    marginBottom: 10,
    lineHeight: 1.2,
  },
  sectionBreakSub: {
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: MUTED_COLOR,
    lineHeight: 1.5,
  },

  // ── Typography ────────────────────────────────────────────────────────────
  h1: {
    fontSize: 22,
    fontFamily: "Times-Bold",      // was EBGaramond 700
    marginBottom: 8,
    color: TEXT_COLOR,
  },
  h2: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 10,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Times-Bold",      // was EBGaramond 700
    marginBottom: 4,
    color: TEXT_COLOR,
    lineHeight: 1.3,
  },
  body: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    lineHeight: 1.55,
    color: TEXT_COLOR,
  },
  muted: {
    fontSize: 9,
    fontFamily: "Times-Italic",
    color: MUTED_COLOR,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  block: {
    marginBottom: 12,
  },
  metricLine: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    marginBottom: 4,
    lineHeight: 1.5,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    marginBottom: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderBottomWidth: 1,
    borderBottomColor: RULE_COLOR,
  },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: FAINT_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
    marginTop: 6,
  },

  // ── Metric grid ───────────────────────────────────────────────────────────
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 4,
    padding: 10,
  },
  metricCardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 20,
    fontFamily: "Times-Bold",      // was EBGaramond 700
    color: TEXT_COLOR,
    lineHeight: 1,
    marginBottom: 5,
  },
  metricCardNote: {
    fontSize: 8,
    fontFamily: "Times-Roman",
    color: MUTED_COLOR,
    lineHeight: 1.4,
  },

  // ── Tag pills ─────────────────────────────────────────────────────────────
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  pill: {
    backgroundColor: "#f0f0ee",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: MUTED_COLOR,
  },
  pillAccent: {
    backgroundColor: ACCENT_LIGHT,
  },
  pillAccentText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
  },

  // ── Rivals body text ──────────────────────────────────────────────────────
  rivalsText: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: MUTED_COLOR,
    lineHeight: 1.4,
    marginBottom: 2,
  },

  // ── Code / schema block ───────────────────────────────────────────────────
  codeBlock: {
    backgroundColor: "#f5f5f0",
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 8.5,
    fontFamily: "Courier",
    color: "#2d2d2d",
    lineHeight: 1.5,
  },
});

// ─── Shared layout components ─────────────────────────────────────────────────

function Block({ children }: { children: ReactNode }) {
  return <View style={s.block}>{children}</View>;
}

/** Fixed teal header bar — renders on every interior page */
function PageHeader({ company }: { company: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderBrand}>IMMORTELL</Text>
      <Text style={s.pageHeaderTitle}>Intelligence Report · {company}</Text>
    </View>
  );
}

/** Fixed footer with auto page numbers — renders on every interior page */
function PageFooter({ company }: { company: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <View style={s.pageFooterRule} />
      <View style={s.pageFooterRow}>
        <Text style={s.pageFooterLeft}>Confidential — {company}</Text>
        <Text
          style={s.pageFooterRight}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </View>
  );
}

/** Lightweight chapter-divider page inserted before major sections */
function SectionBreakPage({
  number,
  title,
  subtitle,
  company,
}: {
  number: string;
  title: string;
  subtitle: string;
  company: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader company={company} />
      <View style={s.sectionBreakBody}>
        <Text style={s.sectionBreakNumber}>{number}</Text>
        <View style={s.sectionBreakRule} />
        <Text style={s.sectionBreakTitle}>{title}</Text>
        <Text style={s.sectionBreakSub}>{subtitle}</Text>
      </View>
      <PageFooter company={company} />
    </Page>
  );
}

// ─── Metric grid ──────────────────────────────────────────────────────────────

function MetricGrid({ metrics }: { metrics: ReportDocumentData["metrics"] }) {
  if (metrics.length === 0) return null;
  const pairs = chunkArray(metrics, 2);
  return (
    <Block>
      <Text style={s.h2}>Radar snapshot</Text>
      {pairs.map((pair, i) => (
        <View key={i} style={s.metricRow}>
          {pair.map((m) => (
            <View key={m.label} style={s.metricCard}>
              <Text style={s.metricCardLabel}>{sanitizePdfText(m.label)}</Text>
              <Text style={s.metricCardValue}>{sanitizePdfText(m.value)}</Text>
              <Text style={s.metricCardNote}>{sanitizePdfText(m.note)}</Text>
            </View>
          ))}
          {/* If odd number of metrics, fill the second column with empty space */}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </Block>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

function BrandMentionItem({ row }: { row: ReportDocumentData["brandMentions"][number] }) {
  return (
    <View style={s.card}>
      <Text style={s.h3}>{sanitizePdfText(row.query)}</Text>
      <Text style={s.muted}>{sanitizePdfText(row.topicName)}</Text>
      <View style={s.tagRow}>
        <View style={s.pill}>
          <Text style={s.pillText}>{sanitizePdfText(row.topicDifficulty)}</Text>
        </View>
        <View style={[s.pill, s.pillAccent]}>
          <Text style={s.pillAccentText}>
            consensus {sanitizePdfText(row.consensusRank)}
          </Text>
        </View>
        <View style={s.pill}>
          <Text style={s.pillText}>model {sanitizePdfText(row.modelRank)}</Text>
        </View>
      </View>
      <Text style={s.label}>Rivals</Text>
      <Text style={s.rivalsText}>{sanitizePdfText(row.otherBrands, 1500)}</Text>
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

      <Text style={s.label}>Rival consensus</Text>
      {highlight.consensus.length === 0 ? (
        <Text style={s.rivalsText}>No consensus rows yet.</Text>
      ) : (
        highlight.consensus.map((c, i) => (
          <Text key={`c-${i}`} style={s.rivalsText}>
            {sanitizePdfText(c.companyName)} · rank {sanitizePdfText(c.rank)} · mentions{" "}
            {sanitizePdfText(c.mentions)}
          </Text>
        ))
      )}

      <Text style={s.label}>Model duel</Text>
      {highlight.byModel.length === 0 ? (
        <Text style={s.rivalsText}>No per-model rows yet.</Text>
      ) : (
        highlight.byModel.map((row, i) => (
          <Text key={`m-${i}`} style={s.rivalsText}>
            {sanitizePdfText(row.model)} · {sanitizePdfText(row.companyName)} ·{" "}
            {sanitizePdfText(row.rank)}
          </Text>
        ))
      )}
    </View>
  );
}

// ─── Main document export ─────────────────────────────────────────────────────

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

      {/* ── PAGE 1: Cover ──────────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBand}>
          <Text style={s.coverBrandmark}>IMMORTELL</Text>
          <View style={s.coverBandRule} />
          <Text style={s.coverBandTagline}>Answer Engine Intelligence Platform</Text>
        </View>

        <View style={s.coverBody}>
          <Text style={s.coverEyebrow}>GEO INTELLIGENCE REPORT</Text>
          <Text style={s.coverTitle}>Intelligence{"\n"}Report</Text>
          <Text style={s.coverCompany}>{company}</Text>
          <View style={s.coverRule} />
          <Text style={s.coverSub}>
            Consolidated radar metrics, topic authority, and GeoKnight rival signals
            for {company}.
          </Text>
        </View>

        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>
            Reporting period: {sanitizePdfText(data.reportPeriodLabel)}
          </Text>
          <Text style={s.coverFooterText}>Generated {generatedLabel}</Text>
        </View>
      </Page>

      {/* ── PAGE 2: Executive Summary + Metric Grid ────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader company={company} />
        <View style={s.pageBody}>
          <Text style={s.h2}>Executive summary</Text>
          <Text style={s.muted}>
            Overview for {sanitizePdfText(data.reportPeriodLabel)} — active prompt coverage
            and citation intelligence tracking.
          </Text>

          <View style={s.metricRow}>
            <View style={s.metricCard}>
              <Text style={s.metricCardLabel}>Active Prompts</Text>
              <Text style={s.metricCardValue}>{String(data.activePromptCount)}</Text>
              <Text style={s.metricCardNote}>Across GeoKnight topics</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricCardLabel}>Prompts Tracked</Text>
              <Text style={s.metricCardValue}>
                {data.promptsTracked > 0 ? String(data.promptsTracked) : "—"}
              </Text>
              <Text style={s.metricCardNote}>Citation intelligence rows</Text>
            </View>
          </View>

          {!data.hasData ? (
            <Text style={[s.muted, { marginTop: 16 }]}>
              No intelligence data yet. Run Refresh data on Company Radar and add topics in
              GeoKnight.
            </Text>
          ) : null}

          {data.radarCalculatedAt ? (
            <Text style={[s.muted, { marginTop: 4 }]}>
              Latest radar run: {sanitizePdfText(data.radarCalculatedAt)}
            </Text>
          ) : null}

          <MetricGrid metrics={data.metrics} />
        </View>
        <PageFooter company={company} />
      </Page>

      {/* ── SECTION BREAK: Brand Mentions ──────────────────────────────────── */}
      {data.brandMentions.length > 0 ? (
        <SectionBreakPage
          number="02"
          title="Brand Mentions"
          subtitle={`All prompts where ${company} appears in rival rows (${data.brandMentions.length} total).`}
          company={company}
        />
      ) : null}

      {/* ── PAGES: Brand mentions — paginated ──────────────────────────────── */}
      {brandChunks.map((chunk, pageIdx) => (
        <Page key={`brand-${pageIdx}`} size="A4" style={s.page}>
          <PageHeader company={company} />
          <View style={s.pageBody}>
            <Text style={s.h2}>Brand mentions in prompts</Text>
            <Text style={s.muted}>
              {pageIdx === 0
                ? `All prompts where ${company} appears in rival rows (${data.brandMentions.length} total).`
                : `Continued (${pageIdx + 1} of ${brandChunks.length}).`}
            </Text>
            {chunk.map((row, i) => (
              <BrandMentionItem key={`${pageIdx}-${i}-${row.query}`} row={row} />
            ))}
          </View>
          <PageFooter company={company} />
        </Page>
      ))}

      {/* ── SECTION BREAK: Rival Highlights ───────────────────────────────── */}
      {data.rivalHighlights.length > 0 ? (
        <SectionBreakPage
          number="03"
          title="Rival Highlights"
          subtitle={`Prompts where ${company} appears in consensus or per-model rows.`}
          company={company}
        />
      ) : null}

      {/* ── PAGES: Rival highlights — one per page to avoid overflow ───────── */}
      {data.rivalHighlights.map((highlight, idx) => (
        <Page key={`rival-${idx}`} size="A4" style={s.page}>
          <PageHeader company={company} />
          <View style={s.pageBody}>
            {idx === 0 ? (
              <>
                <Text style={s.h2}>Rival comparison highlights</Text>
                <Text style={s.muted}>
                  Prompts where {company} appears in consensus or per-model rows.
                </Text>
              </>
            ) : null}
            <RivalHighlightItem highlight={highlight} />
          </View>
          <PageFooter company={company} />
        </Page>
      ))}

      {/* ── SECTION BREAK: Bounty Pages ────────────────────────────────────── */}
      {data.bountyPages.length > 0 ? (
        <SectionBreakPage
          number="04"
          title="Bounty Pages"
          subtitle={`AEO pages generated from hunted bounties (${data.bountyPages.length} pages).`}
          company={company}
        />
      ) : null}

      {/* ── PAGE: Bounty pages ─────────────────────────────────────────────── */}
      {data.bountyPages.length > 0 ? (
        <Page size="A4" style={s.page}>
          <PageHeader company={company} />
          <View style={s.pageBody}>
            <Text style={s.h2}>Generated bounty pages</Text>
            <Text style={s.muted}>
              AEO pages linked from hunted bounties ({data.bountyPages.length} pages).
            </Text>
            {data.bountyPages.map((row, i) => (
              <View key={`bounty-${i}`} style={s.card}>
                <Text style={s.h3}>{sanitizePdfText(row.pageTitle)}</Text>
                <Text style={s.muted}>{sanitizePdfText(row.query)}</Text>
              </View>
            ))}
          </View>
          <PageFooter company={company} />
        </Page>
      ) : null}

    </Document>
  );
}
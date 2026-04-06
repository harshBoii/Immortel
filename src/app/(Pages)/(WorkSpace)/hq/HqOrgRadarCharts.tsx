"use client";

import { useMemo, useState } from "react";
import {
  ModelBreakdownChart,
  RIVAL_COLORS,
  SovTrendChart,
  type ModelBreakRow,
  type SovPoint,
} from "@/app/(Pages)/(WorkSpace)/geo/radar/sov-charts";

type CompanySlice = {
  companyId: string;
  companyName: string;
  sovSeries: SovPoint[];
  modelBreakdown: ModelBreakRow[];
};

// ── Bare select — no wrapper div, used inline in toolbar ───────────────────────

function ToolbarSelect({
  label,
  labelColor = "muted",
  value,
  onChange,
  children,
}: {
  label: string;
  labelColor?: "accent" | "muted";
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
          labelColor === "accent"
            ? "text-[var(--sibling-accent)]"
            : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <div className="relative">
        <select
          className="appearance-none rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/90 pl-3 pr-8 py-2 text-sm font-medium text-foreground transition focus:outline-none focus:ring-2 focus:ring-[var(--sibling-primary)]/40 hover:border-[var(--sibling-primary)]/40 min-w-[180px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HqOrgRadarCharts({
  organizationLabel,
  aggregate,
  companies,
}: {
  organizationLabel: string;
  aggregate: { sovSeries: SovPoint[]; modelBreakdown: ModelBreakRow[] };
  companies: CompanySlice[];
}) {
  const options = useMemo(
    () => [
      { key: "__org__", label: `${organizationLabel} (combined)` },
      ...companies.map((c) => ({ key: c.companyId, label: c.companyName })),
    ],
    [organizationLabel, companies]
  );

  const [primaryKey, setPrimaryKey] = useState("__org__");
  const [compareKey, setCompareKey] = useState("");

  const resolve = (key: string) => {
    if (key === "__org__")
      return {
        label: `${organizationLabel} (combined)`,
        sovSeries: aggregate.sovSeries,
        modelBreakdown: aggregate.modelBreakdown,
      };
    const c = companies.find((x) => x.companyId === key);
    return c
      ? { label: c.companyName, sovSeries: c.sovSeries, modelBreakdown: c.modelBreakdown }
      : {
          label: organizationLabel,
          sovSeries: aggregate.sovSeries,
          modelBreakdown: aggregate.modelBreakdown,
        };
  };

  const primary = resolve(primaryKey);
  const compare = compareKey && compareKey !== primaryKey ? resolve(compareKey) : null;
  const compareOptions = options.filter((o) => o.key !== primaryKey);

  return (
    /*
     * Outer card: gives the entire section a visible surface + border.
     * Without this the section bleeds into the page background.
     */

    <section className="rounded-xl border border-[var(--glass-border)] overflow-hidden shadow-sm">

      {/* ── Card header ───────────────────────────────────────────────────── */}
      {/*  Slightly darker tint than the chart area beneath it               */}
      <div className="bg-[var(--glass)]/70 border-b border-[var(--glass-border)] px-5 py-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Org Radar Comparison</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Compare share of voice and model mix across the org and each subsidiary.
          </p>
        </div>

        {/* Selects sit right inside the header, no floating */}
        <div className="flex flex-wrap items-end gap-3 shrink-0">
          <ToolbarSelect
            label="Primary series"
            labelColor="accent"
            value={primaryKey}
            onChange={(v) => {
              setPrimaryKey(v);
              setCompareKey((prev) => (prev === v ? "" : prev));
            }}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </ToolbarSelect>

          <ToolbarSelect
            label="Compare with"
            value={compareKey}
            onChange={setCompareKey}
          >
            <option value="">None</option>
            {compareOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </ToolbarSelect>
        </div>
      </div>

      {/* ── Chart area ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 bg-[var(--glass)]/30 p-5 lg:grid-cols-2">

        {/* SoV Trend */}
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Share of Voice Trend</p>
            <p className="text-[11px] text-muted-foreground">Recent radar runs · HQ view</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--glass-border)]/70 bg-[var(--glass)]/60 px-2 pb-2 pt-1">
            <SovTrendChart
              series={primary.sovSeries}
              compare={compare ? { label: compare.label, series: compare.sovSeries } : null}
              rivalColor={RIVAL_COLORS[1]}
              primaryName={primary.label}
            />
          </div>
        </div>

        {/* Model Breakdown */}
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Model Breakdown</p>
            <p className="text-[11px] text-muted-foreground">Average share of voice by AI model</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--glass-border)]/70 bg-[var(--glass)]/60 px-2 pb-2 pt-1">
            <ModelBreakdownChart
              rows={primary.modelBreakdown}
              compare={compare ? { label: compare.label, rows: compare.modelBreakdown } : null}
              rivalColor={RIVAL_COLORS[1]}
              primaryName={primary.label}
            />
          </div>
        </div>
      </div>

      {/* ── Comparison legend strip ────────────────────────────────────────── */}
      {compare && (
        <div className="border-t border-[var(--glass-border)] bg-[var(--glass)]/50 px-5 py-2.5 flex items-center gap-2.5 text-xs text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--sibling-primary)" }}
          />
          <span className="font-medium text-foreground">{primary.label}</span>
          <span className="opacity-30 text-base leading-none">·</span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: RIVAL_COLORS[1] }}
          />
          <span className="font-medium text-foreground">{compare.label}</span>
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            onClick={() => setCompareKey("")}
          >
            Clear
          </button>
        </div>
      )}
    </section>

  );
}
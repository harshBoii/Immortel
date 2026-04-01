"use client";

import { useEffect, useMemo, useState } from "react";
import { ViewMoreDropdown } from "@/app/components/common/UI/ViewMoreDropdown";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SovPoint = {
  calculatedAt: string;
  shareOfVoice: number | null;
  model?: string;
};

/** Distinct colors for rival series. Index 0 = first rival, etc. "You" always uses var(--primary). */
export const RIVAL_COLORS = [
  "#f97316", // orange
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#ef4444", // red
  "#10b981", // emerald
];

/** Given a series sorted by calculatedAt (any order), keep the most recent snapshot per day.
 *  Returns a Map keyed by midnight-ms (start of UTC day) → shareOfVoice value. */
function collapseByDay(points: SovPoint[]): Map<number, number> {
  // Sort ascending so that later entries overwrite earlier ones for the same day.
  const sorted = [...points].sort(
    (a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime()
  );
  const byDay = new Map<number, number>();
  for (const d of sorted) {
    if (d.shareOfVoice == null || Number.isNaN(d.shareOfVoice)) continue;
    const ts = new Date(d.calculatedAt);
    if (!Number.isFinite(ts.getTime())) continue;
    const dayKey = Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate());
    byDay.set(dayKey, d.shareOfVoice); // last write wins → most recent on that day
  }
  return byDay;
}

export function SovTrendChart({
  series,
  compare,
  rivalColor,
}: {
  series: SovPoint[];
  compare?: { label: string; series: SovPoint[] } | null;
  rivalColor?: string;
}) {
  const ourByDay = collapseByDay(series ?? []);
  const compareByDay = compare ? collapseByDay(compare.series ?? []) : new Map<number, number>();

  const daySet = new Set<number>([...ourByDay.keys(), ...compareByDay.keys()]);
  const dayList = [...daySet].sort((a, b) => a - b);

  const data = dayList.map((dayKey) => ({
    dayKey,
    label: new Date(dayKey).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    fullLabel: new Date(dayKey).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    sov: ourByDay.get(dayKey) ?? null,
    rivalSov: compareByDay.get(dayKey) ?? null,
  }));

  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">No trend data yet.</p>
    );
  }

  const showOurDots = ourByDay.size <= 2;
  const showRivalDots = compareByDay.size <= 2;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--glass-border)]" />
        <XAxis dataKey="dayKey" tick={{ fontSize: 10 }} tickFormatter={(_, i) => data[i]?.label ?? ""} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
          formatter={(value: number | string | undefined, name) => {
            const n = typeof value === "number" ? value : Number(value ?? 0);
            const label = name === "rivalSov" ? (compare ? `${compare.label} SoV` : "Rival SoV") : "Your SoV";
            return [`${n.toFixed(1)}`, label];
          }}
          contentStyle={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="sov"
          name="You"
          stroke="var(--primary)"
          dot={showOurDots}
          strokeWidth={2}
          connectNulls
        />
        {compare ? (
          <Line
            type="monotone"
            dataKey="rivalSov"
            name={compare.label}
            stroke={rivalColor ?? RIVAL_COLORS[0]}
            dot={showRivalDots}
            strokeWidth={2}
            connectNulls
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export type ModelBreakRow = {
  model: string;
  avgShareOfVoice: number;
  avgTop3Rate: number;
  avgQueryCoverage: number;
};

export function ModelBreakdownChart({
  rows,
  compare,
  rivalColor,
}: {
  rows: ModelBreakRow[];
  compare?: { label: string; rows: ModelBreakRow[] } | null;
  rivalColor?: string;
}) {
  const compareByModel = new Map<string, number>();
  for (const r of compare?.rows ?? []) {
    compareByModel.set(r.model, Math.round(r.avgShareOfVoice * 10) / 10);
  }

  const data = rows.map((r) => ({
    model: r.model,
    label: r.model.length > 12 ? `${r.model.slice(0, 12)}…` : r.model,
    sov: Math.round(r.avgShareOfVoice * 10) / 10,
    rivalSov: compareByModel.get(r.model) ?? null,
  }));
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">No model breakdown.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--glass-border)]" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit="%" />
        <Tooltip
          contentStyle={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="sov" name="You" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        {compare ? (
          <Bar
            dataKey="rivalSov"
            name={compare.label}
            fill={rivalColor ?? RIVAL_COLORS[0]}
            radius={[4, 4, 0, 0]}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  );
}

function cleanCompanyNameForMatch(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  let s = raw;
  try {
    const url = raw.includes("://") ? new URL(raw) : null;
    if (url?.hostname) s = url.hostname;
  } catch {
    // ignore
  }
  s = s.trim().toLowerCase();
  if (s.startsWith("www.")) s = s.slice(4);
  const looksLikeDomain = !/\s/.test(s) && s.includes(".");
  if (looksLikeDomain) {
    s = s.replace(/\.+$/, "");
    const parts = s.split(".");
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1]!;
      const commonTlds = new Set(["com", "io", "ai", "net", "org", "co", "app", "dev", "xyz"]);
      if (commonTlds.has(tld)) {
        parts.pop();
        s = parts.join(".");
      }
    }
  }
  return s.trim();
}

function cleanCompanyNameForLabel(input: string): string {
  const c = cleanCompanyNameForMatch(input);
  if (!c) return "";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function RadarCompareCharts({
  base,
  rivals,
}: {
  base: { sovSeries: SovPoint[]; modelBreakdown: ModelBreakRow[] };
  rivals: Array<{ id: string; name: string }>;
}) {
  const [compareId, setCompareId] = useState<string>("");
  const [comparePayload, setComparePayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const compareLabel = useMemo(() => {
    const raw = rivals.find((r) => r.id === compareId)?.name ?? "";
    return cleanCompanyNameForLabel(raw) || raw || "Rival";
  }, [compareId, rivals]);

  const rivalColor = useMemo(() => {
    const idx = rivals.findIndex((r) => r.id === compareId);
    return idx >= 0 ? (RIVAL_COLORS[idx % RIVAL_COLORS.length] ?? RIVAL_COLORS[0]) : RIVAL_COLORS[0];
  }, [compareId, rivals]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!compareId) {
        setComparePayload(null);
        setErr(null);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/geo/radar/compare?companyId=${encodeURIComponent(compareId)}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) {
          setErr(data?.error ?? "Failed to load rival radar payload.");
          setComparePayload(null);
          return;
        }
        setComparePayload(data.payload ?? null);
      } catch {
        if (cancelled) return;
        setErr("Network error while loading rival payload.");
        setComparePayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [compareId]);

  const compare = comparePayload
    ? {
        label: compareLabel,
        sovSeries: (comparePayload.sovSeries ?? []) as SovPoint[],
        modelBreakdown: (comparePayload.modelBreakdown ?? []) as ModelBreakRow[],
      }
    : null;

  const rivalLatest = comparePayload?.latest ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Compare is based on the rival’s persisted radar runs (e.g. from GeoKnight “Analyze rival”).
          </p>
          {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Compare vs</label>
          <ViewMoreDropdown tooltipContent="Pick rival" align="right">
            {(close) => (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setCompareId("");
                    close();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs ${
                    compareId === "" ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-[var(--glass-hover)]"
                  }`}
                >
                  None
                </button>
                {rivals.map((r, idx) => {
                  const color = RIVAL_COLORS[idx % RIVAL_COLORS.length] ?? RIVAL_COLORS[0]!;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCompareId(r.id);
                        close();
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                        compareId === r.id
                          ? "text-primary font-medium bg-primary/10"
                          : "text-foreground hover:bg-[var(--glass-hover)]"
                      }`}
                    >
                      <span
                        className="inline-block shrink-0 rounded-full"
                        style={{ width: 8, height: 8, background: color }}
                      />
                      {cleanCompanyNameForLabel(r.name) || r.name}
                    </button>
                  );
                })}
              </div>
            )}
          </ViewMoreDropdown>
          <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2.5 py-2 text-xs">
            {compareId
              ? cleanCompanyNameForLabel(rivals.find((r) => r.id === compareId)?.name ?? "") ||
                rivals.find((r) => r.id === compareId)?.name ||
                "Selected rival"
              : "None"}
          </div>
          {loading ? <span className="text-[11px] text-muted-foreground">Loading…</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card card-anime-float rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground">Share of voice trend</h3>
          <p className="text-xs text-muted-foreground mt-1">Recent radar runs</p>
          <div className="mt-2 h-[240px]">
            <SovTrendChart
              series={base.sovSeries}
              compare={compare ? { label: compare.label, series: compare.sovSeries } : null}
              rivalColor={rivalColor}
            />
          </div>
        </div>
        <div className="glass-card card-anime-float rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground">Model breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">Average SoV by model</p>
          <div className="mt-2 h-[240px]">
            <ModelBreakdownChart
              rows={base.modelBreakdown}
              compare={compare ? { label: compare.label, rows: compare.modelBreakdown } : null}
              rivalColor={rivalColor}
            />
          </div>
        </div>
      </div>

      {compareId && compare && rivalLatest ? (
        <div className="glass-card card-anime-float rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {compare.label} · recent snapshot
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {rivalLatest?.calculatedAt ? new Date(rivalLatest.calculatedAt).toLocaleString() : "—"}
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "AI Share of Voice", value: rivalLatest.shareOfVoice, suffix: "%", digits: 1 },
              { label: "Top-3 Mention Rate", value: rivalLatest.top3Rate, suffix: "%", digits: 0 },
              { label: "Query Coverage", value: rivalLatest.queryCoverage, suffix: "%", digits: 1 },
              { label: "Competitor rank", value: rivalLatest.competitorRank, prefix: "#", digits: 1 },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-lg bg-[var(--glass)]/60 border border-[var(--glass-border)]/60 p-3"
              >
                <p className="text-[11px] font-semibold text-foreground">{c.label}</p>
                <p className="mt-2 text-xl font-semibold text-foreground tabular-nums tracking-tight">
                  {c.value == null || Number.isNaN(Number(c.value))
                    ? "—"
                    : `${c.prefix ?? ""}${Number(c.value).toFixed(c.digits)}${c.suffix ?? ""}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

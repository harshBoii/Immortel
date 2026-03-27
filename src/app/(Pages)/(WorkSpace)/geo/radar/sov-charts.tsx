"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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

export function SovTrendChart({ series }: { series: SovPoint[] }) {
  const data = series.map((d) => ({
    ts: new Date(d.calculatedAt).getTime(),
    label: new Date(d.calculatedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    fullLabel: new Date(d.calculatedAt).toLocaleString(),
    sov: d.shareOfVoice ?? 0,
  }));
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">No trend data yet.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--glass-border)]" />
        <XAxis dataKey="ts" tick={{ fontSize: 10 }} tickFormatter={(_, i) => data[i]?.label ?? ""} />
        <YAxis tick={{ fontSize: 10 }} unit="%" />
        <Tooltip
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
          formatter={(value: number | string | undefined) => {
            const n = typeof value === "number" ? value : Number(value ?? 0);
            return [`${n.toFixed(1)}%`, "Share of voice"];
          }}
          contentStyle={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="sov" name="Share of voice" stroke="var(--primary)" dot={false} strokeWidth={2} />
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

export function ModelBreakdownChart({ rows }: { rows: ModelBreakRow[] }) {
  const data = rows.map((r) => ({
    model: r.model.length > 12 ? `${r.model.slice(0, 12)}…` : r.model,
    sov: Math.round(r.avgShareOfVoice * 10) / 10,
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
        <XAxis dataKey="model" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit="%" />
        <Tooltip
          contentStyle={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="sov" name="Avg SoV" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

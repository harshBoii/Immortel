"use client";

import {
  BarChart3,
  Download,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  Clock,
  DollarSign,
  UserPlus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  formatCurrencyCents,
  formatDuration,
} from "@/app/components/calls/common/format";

type Kpis = {
  totalCalls: number;
  completed: number;
  dropped: number;
  failed: number;
  converted: number;
  interested: number;
  leadsCreated: number;
  avgDurationSec: number;
  totalDurationSec: number;
  totalCostCents: number;
};

type TimePoint = { date: string; calls: number; completed: number; converted: number };
type FunnelStage = { stage: string; count: number };
type OutcomeStat = { outcome: string; count: number };

const FUNNEL_COLORS = ["#60a5fa", "#818cf8", "#a78bfa", "#f472b6", "#34d399"];
const OUTCOME_COLORS: Record<string, string> = {
  CONVERTED: "#10b981",
  INTERESTED: "#34d399",
  NOT_INTERESTED: "#f43f5e",
  CALL_BACK_LATER: "#f59e0b",
  NO_ANSWER: "#64748b",
  WRONG_NUMBER: "#ef4444",
  OTHER: "#94a3b8",
  UNKNOWN: "#475569",
};

export default function ReportsDashboard({
  windowDays,
  kpis,
  timeseries,
  funnel,
  outcomeBreakdown,
}: {
  windowDays: number;
  kpis: Kpis;
  timeseries: TimePoint[];
  funnel: FunnelStage[];
  outcomeBreakdown: OutcomeStat[];
}) {
  const answerRate = kpis.totalCalls > 0 ? (kpis.completed / kpis.totalCalls) * 100 : 0;
  const conversionRate =
    kpis.completed > 0 ? (kpis.converted / kpis.completed) * 100 : 0;
  const dropRate = kpis.totalCalls > 0 ? (kpis.dropped / kpis.totalCalls) * 100 : 0;

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Reports"
        description={`Last ${windowDays} days of calls, outcomes, and revenue signals.`}
        actions={
          <a
            href={`/api/calls/reports/export?days=${windowDays}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--glass-hover)]"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        }
      />

      <KpiRow
        items={[
          {
            label: "Calls Placed",
            value: kpis.totalCalls.toLocaleString(),
            icon: PhoneCall,
          },
          {
            label: "Connected",
            value: kpis.completed.toLocaleString(),
            icon: CheckCircle2,
            hint: `${answerRate.toFixed(1)}% answer rate`,
          },
          {
            label: "Converted",
            value: kpis.converted.toLocaleString(),
            icon: Sparkles,
            hint: `${conversionRate.toFixed(1)}% conversion`,
          },
          {
            label: "New Leads",
            value: kpis.leadsCreated.toLocaleString(),
            icon: UserPlus,
          },
          {
            label: "Avg Duration",
            value: formatDuration(kpis.avgDurationSec),
            icon: Clock,
          },
          {
            label: "Est. Cost",
            value: formatCurrencyCents(kpis.totalCostCents),
            icon: DollarSign,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-5 lg:col-span-2">
          <header className="mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--sibling-primary)]" />
            <h3 className="font-heading text-sm font-semibold">Daily volume</h3>
          </header>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <CartesianGrid stroke="var(--glass-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "none", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="calls" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="converted" stroke="#f472b6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-5">
          <h3 className="font-heading text-sm font-semibold mb-3">Key rates</h3>
          <RatesBar label="Answer rate" value={answerRate} color="#60a5fa" />
          <RatesBar label="Conversion rate" value={conversionRate} color="#34d399" />
          <RatesBar label="Drop rate" value={dropRate} color="#f43f5e" />

          <div className="mt-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/40 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
              Total talk time
            </div>
            <div className="mt-0.5 font-heading text-xl font-semibold">
              {formatDuration(kpis.totalDurationSec)}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-5">
          <h3 className="font-heading text-sm font-semibold mb-3">Conversion funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid stroke="var(--glass-border)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "currentColor" }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "none", fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-5">
          <h3 className="font-heading text-sm font-semibold mb-3">Outcome mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeBreakdown}
                  dataKey="count"
                  nameKey="outcome"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {outcomeBreakdown.map((o) => (
                    <Cell key={o.outcome} fill={OUTCOME_COLORS[o.outcome] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "none", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function RatesBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground/80">{label}</span>
        <span className="font-semibold tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--glass-hover)]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

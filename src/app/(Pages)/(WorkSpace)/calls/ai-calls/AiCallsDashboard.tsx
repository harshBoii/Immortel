"use client";

import { useMemo, useState } from "react";
import {
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  Clock,
  Activity,
  RefreshCw,
  Download,
  ChevronDown,
} from "lucide-react";
import type {
  CallDirection,
  CallOutcome,
  CallStatus,
  Sentiment,
} from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  CallsTable,
  type CallsTableColumn,
} from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { DetailDrawer } from "@/app/components/calls/common/DetailDrawer";
import {
  formatDuration,
  formatRelative,
  formatCurrencyCents,
  formatDateTime,
} from "@/app/components/calls/common/format";

export type CallRow = {
  id: string;
  externalCallId: string | null;
  direction: CallDirection;
  status: CallStatus;
  outcome: CallOutcome | null;
  sentiment: Sentiment | null;
  durationSec: number | null;
  costCents: number | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  dropReason: string | null;
  failureReason: string | null;
  lead: { id: string; name: string; phone: string } | null;
};

type Kpis = {
  last24: number;
  connected: number;
  converted: number;
  dropped: number;
  avgDurationSec: number;
  connectRate: number;
};

const STATUS_CHIPS = [
  { id: "all", label: "All" },
  { id: "COMPLETED", label: "Completed" },
  { id: "QUEUED", label: "Queued" },
  { id: "RINGING", label: "Ringing" },
  { id: "IN_PROGRESS", label: "In-progress" },
  { id: "NO_ANSWER", label: "No answer" },
  { id: "DROPPED", label: "Dropped" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
];

function statusBadge(s: CallStatus) {
  const colors: Record<CallStatus, string> = {
    COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    QUEUED: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    RINGING: "bg-sky-400/10 text-sky-400 border-sky-400/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    NO_ANSWER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    DROPPED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    FAILED: "bg-rose-600/10 text-rose-600 border-rose-600/20",
    CANCELLED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${colors[s]}`}
    >
      {s.replace("_", " ")}
    </span>
  );
}

function outcomeBadge(o: CallOutcome | null) {
  if (!o) return <span className="text-muted-foreground/60">—</span>;
  const map: Record<CallOutcome, string> = {
    CONVERTED: "text-emerald-600",
    INTERESTED: "text-emerald-500",
    NOT_INTERESTED: "text-rose-500",
    CALL_BACK_LATER: "text-amber-500",
    NO_ANSWER: "text-slate-400",
    WRONG_NUMBER: "text-rose-400",
  };
  return (
    <span className={`text-[12px] font-semibold ${map[o]}`}>
      {o.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

export default function AiCallsDashboard({
  kpis,
  initial,
}: {
  kpis: Kpis;
  initial: CallRow[];
}) {
  const [calls, setCalls] = useState<CallRow[]>(initial);
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState<CallRow | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    if (status === "all") return calls;
    return calls.filter((c) => c.status === status);
  }, [calls, status]);

  async function refresh() {
    const r = await fetch("/api/calls/ai-calls?pageSize=100", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { items: CallRow[] };
      setCalls(j.items);
    }
  }

  async function openCall(row: CallRow) {
    setActive(row);
    setDetail(null);
    setLoadingDetail(true);
    const r = await fetch(`/api/calls/ai-calls/${row.id}`, { cache: "no-store" });
    setLoadingDetail(false);
    if (r.ok) {
      const j = await r.json();
      setDetail(j.call ?? null);
    }
  }

  async function retry(row: CallRow) {
    const r = await fetch(`/api/calls/ai-calls/${row.id}/retry`, { method: "POST" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Retry failed: ${j.error ?? r.statusText}`);
      return;
    }
    alert("Retry queued.");
    await refresh();
  }

  const columns: CallsTableColumn<CallRow>[] = [
    {
      key: "lead",
      header: "Lead",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {r.lead?.name ?? "Unknown"}
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            {r.lead?.phone ?? "—"}
          </span>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (r) => statusBadge(r.status) },
    { key: "outcome", header: "Outcome", cell: (r) => outcomeBadge(r.outcome) },
    {
      key: "dur",
      header: "Duration",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatDuration(r.durationSec)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatCurrencyCents(r.costCents)}
        </span>
      ),
    },
    {
      key: "when",
      header: "When",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {formatRelative(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {(r.status === "DROPPED" ||
            r.status === "FAILED" ||
            r.status === "NO_ANSWER" ||
            r.status === "CANCELLED") &&
            r.lead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void retry(r);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-1 text-[11px] hover:bg-[var(--sibling-primary)]/10"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="AI Calls"
        description="All automated calls with live status, transcripts, and outcomes."
        actions={
          <>
            <a
              href="/api/calls/reports/export?days=30"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--glass-hover)]"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--glass-hover)]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </>
        }
      />

      <KpiRow
        items={[
          {
            label: "Calls (24h)",
            value: kpis.last24.toLocaleString(),
            icon: PhoneCall,
          },
          {
            label: "Connected",
            value: kpis.connected.toLocaleString(),
            icon: CheckCircle2,
            hint: `${kpis.connectRate.toFixed(0)}% connect rate`,
          },
          {
            label: "Converted",
            value: kpis.converted.toLocaleString(),
            icon: Activity,
          },
          {
            label: "Dropped",
            value: kpis.dropped.toLocaleString(),
            icon: PhoneOff,
          },
          {
            label: "Avg Duration",
            value: formatDuration(kpis.avgDurationSec),
            icon: Clock,
          },
          {
            label: "Connect Rate",
            value: `${kpis.connectRate.toFixed(1)}%`,
          },
        ]}
      />

      <FilterChips chips={STATUS_CHIPS} activeId={status} onChange={setStatus} />

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        onRowClick={openCall}
        empty={
          <div className="text-sm text-muted-foreground">
            No calls yet. Start one from the Leads page.
          </div>
        }
      />

      <DetailDrawer
        open={!!active}
        title={active?.lead?.name ?? "Call"}
        subtitle={active?.lead?.phone}
        onClose={() => setActive(null)}
        widthClass="w-full sm:w-[560px]"
      >
        {!active ? null : (
          <div className="flex flex-col gap-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(active.status)}
              {outcomeBadge(active.outcome)}
              {active.sentiment && (
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-0.5 text-[10.5px] uppercase tracking-wide">
                  {active.sentiment}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Info label="Started" value={formatDateTime(active.startedAt)} />
              <Info label="Ended" value={formatDateTime(active.endedAt)} />
              <Info label="Duration" value={formatDuration(active.durationSec)} />
              <Info label="Cost" value={formatCurrencyCents(active.costCents)} />
              <Info label="External ID" value={active.externalCallId ?? "—"} mono />
              <Info label="Direction" value={active.direction} />
            </div>

            {active.dropReason && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-400">
                <strong className="font-semibold">Drop reason:</strong> {active.dropReason}
              </div>
            )}
            {active.failureReason && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-400">
                <strong className="font-semibold">Failure:</strong> {active.failureReason}
              </div>
            )}

            {active.recordingUrl && (
              <div>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Recording
                </h4>
                <audio controls src={active.recordingUrl} className="w-full" />
              </div>
            )}

            {loadingDetail && (
              <div className="text-[12px] text-muted-foreground">Loading transcript…</div>
            )}
            {!!detail && <TranscriptBlock detail={detail} />}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono text-[11.5px]" : ""} text-foreground break-all`}
      >
        {value}
      </dd>
    </div>
  );
}

type TranscriptBlob = {
  transcript?: {
    summary?: string | null;
    turns?: unknown;
    qa?: unknown;
    objections?: string[];
    aiConfidence?: number | null;
    suggestedNextMove?: string | null;
  } | null;
};

function TranscriptBlock({ detail }: { detail: Record<string, unknown> }) {
  const t = (detail as TranscriptBlob).transcript;
  if (!t) {
    return (
      <div className="text-[12px] text-muted-foreground">No transcript yet.</div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {t.summary && (
        <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/50 px-3 py-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Summary
          </h4>
          <p className="mt-1 text-[13px] text-foreground">{t.summary}</p>
        </div>
      )}
      {t.suggestedNextMove && (
        <div className="rounded-lg border border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)]/5 px-3 py-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sibling-primary)]">
            Suggested next move
          </h4>
          <p className="mt-1 text-[13px]">{t.suggestedNextMove}</p>
        </div>
      )}
      {t.objections && t.objections.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Objections raised
          </h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {t.objections.map((o) => (
              <span
                key={o}
                className="rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] text-amber-500"
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      )}
      {!!t.qa && typeof t.qa === "object" && Object.keys(t.qa as object).length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Q&amp;A
          </h4>
          <div className="mt-2 space-y-2">
            {Object.entries(t.qa as Record<string, unknown>).map(([q, a]) => (
              <div
                key={q}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/50 px-3 py-2"
              >
                <div className="text-[12px] font-semibold text-foreground">{q}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {typeof a === "string" && a.trim() ? a : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(t.turns) && t.turns.length > 0 && (
        <details className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/50 px-3 py-2 text-[12px]">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
            <ChevronDown className="w-3 h-3" /> Full transcript
          </summary>
          <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-[11.5px] text-muted-foreground">
            {JSON.stringify(t.turns, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

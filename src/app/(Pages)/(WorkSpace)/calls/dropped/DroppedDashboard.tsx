"use client";

import { useMemo, useState } from "react";
import { PhoneOff, AlertTriangle, Clock, RefreshCw, Wifi } from "lucide-react";
import type { CallStatus, CallOutcome } from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  CallsTable,
  type CallsTableColumn,
} from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { formatDuration, formatRelative } from "@/app/components/calls/common/format";

export type DroppedRow = {
  id: string;
  status: CallStatus;
  outcome: CallOutcome | null;
  durationSec: number | null;
  dropReason: string | null;
  failureReason: string | null;
  createdAt: string;
  lead: { id: string; name: string; phone: string } | null;
};

type Kpis = {
  total: number;
  last24: number;
  short: number;
  noAnswer: number;
  network: number;
};

const CHIPS = [
  { id: "all", label: "All" },
  { id: "short", label: "< 10s" },
  { id: "noanswer", label: "No answer" },
  { id: "network", label: "Network issues" },
];

export default function DroppedDashboard({
  kpis,
  initial,
}: {
  kpis: Kpis;
  initial: DroppedRow[];
}) {
  const [items, setItems] = useState<DroppedRow[]>(initial);
  const [filter, setFilter] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filter === "short") return (r.durationSec ?? 0) < 10;
      if (filter === "noanswer")
        return (
          r.status === "NO_ANSWER" ||
          r.outcome === "NO_ANSWER" ||
          (r.durationSec ?? 0) === 0
        );
      if (filter === "network")
        return (r.dropReason ?? "").toLowerCase().includes("network");
      return true;
    });
  }, [items, filter]);

  async function refresh() {
    const r = await fetch("/api/calls/dropped?pageSize=100", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { items: DroppedRow[] };
      setItems(j.items);
    }
  }

  async function retry(row: DroppedRow) {
    setRetrying(row.id);
    const r = await fetch(`/api/calls/ai-calls/${row.id}/retry`, { method: "POST" });
    setRetrying(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Retry failed: ${j.error ?? r.statusText}`);
      return;
    }
    await refresh();
  }

  const columns: CallsTableColumn<DroppedRow>[] = [
    {
      key: "lead",
      header: "Lead",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.lead?.name ?? "Unknown"}</span>
          <span className="text-[11px] text-muted-foreground/70">
            {r.lead?.phone ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span className="text-[12px] font-semibold text-rose-500">
          {r.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "dur",
      header: "Duration",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatDuration(r.durationSec)}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.dropReason ?? r.failureReason ?? "—"}
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
        <button
          type="button"
          disabled={!r.lead || retrying === r.id}
          onClick={() => void retry(r)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-1 text-[11px] hover:bg-[var(--sibling-primary)]/10 disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${retrying === r.id ? "animate-spin" : ""}`} />{" "}
          Retry
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Dropped Calls"
        description="Calls that didn't connect or ended abruptly. Retry in a click."
      />

      <KpiRow
        items={[
          { label: "All-time", value: kpis.total.toLocaleString(), icon: PhoneOff },
          { label: "Last 24h", value: kpis.last24.toLocaleString(), icon: Clock },
          {
            label: "< 10s",
            value: kpis.short.toLocaleString(),
            icon: AlertTriangle,
          },
          { label: "No answer", value: kpis.noAnswer.toLocaleString() },
          { label: "Network", value: kpis.network.toLocaleString(), icon: Wifi },
          { label: "Shown", value: filtered.length.toLocaleString() },
        ]}
      />

      <FilterChips chips={CHIPS} activeId={filter} onChange={setFilter} />

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        empty={
          <div className="text-sm text-muted-foreground">
            No dropped calls. Connectivity looking good.
          </div>
        }
      />
    </div>
  );
}

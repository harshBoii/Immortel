"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  Clock,
  CheckCircle2,
  AlarmClock,
  PhoneCall,
  Check,
  Pause,
} from "lucide-react";
import type {
  FollowUpPriority,
  FollowUpReason,
  FollowUpStatus,
  LeadStage,
} from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  CallsTable,
  type CallsTableColumn,
} from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { formatRelative, formatDateTime } from "@/app/components/calls/common/format";

export type FollowUpRow = {
  id: string;
  reason: FollowUpReason;
  customReason: string | null;
  dueAt: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  lead: { id: string; name: string; phone: string; stage: LeadStage } | null;
};

type Kpis = {
  pending: number;
  overdue: number;
  today: number;
  completedToday: number;
};

function priorityBadge(p: FollowUpPriority) {
  const map: Record<FollowUpPriority, string> = {
    LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    MEDIUM: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    HIGH: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${map[p]}`}
    >
      {p}
    </span>
  );
}

const DUE_CHIPS = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
];

export default function FollowUpsDashboard({
  kpis,
  initial,
}: {
  kpis: Kpis;
  initial: FollowUpRow[];
}) {
  const [items, setItems] = useState<FollowUpRow[]>(initial);
  const [dueFilter, setDueFilter] = useState("all");

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const filtered = useMemo(() => {
    return items.filter((f) => {
      const due = new Date(f.dueAt).getTime();
      if (dueFilter === "overdue") return due < now && f.status === "PENDING";
      if (dueFilter === "today")
        return due >= startOfDay.getTime() && due <= endOfDay.getTime();
      if (dueFilter === "upcoming") return due > endOfDay.getTime();
      return true;
    });
  }, [items, dueFilter, now, startOfDay, endOfDay]);

  async function refresh() {
    const r = await fetch("/api/calls/follow-ups?pageSize=100", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { items: FollowUpRow[] };
      setItems(j.items);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/calls/follow-ups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) await refresh();
  }

  async function callNow(row: FollowUpRow) {
    if (!row.lead) return;
    const body = {
      to: row.lead.phone,
      name: row.lead.name,
      company: "",
      product: "Follow-up",
      perks_of_product: "",
      info_about_lead: "",
      languageMode: "english",
      voiceMode: "speed",
      llm_provider: "groq",
      leadId: row.lead.id,
    };
    const res = await fetch("/api/calling-agent/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      alert("Failed to start call");
      return;
    }
    await patch(row.id, { status: "DONE" });
  }

  const columns: CallsTableColumn<FollowUpRow>[] = [
    {
      key: "lead",
      header: "Lead",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.lead?.name ?? "—"}</span>
          <span className="text-[11px] text-muted-foreground/70">{r.lead?.phone ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="text-[12px]">
          {r.reason.replace(/_/g, " ").toLowerCase()}
          {r.customReason && (
            <span className="block text-[11px] text-muted-foreground/70">
              {r.customReason}
            </span>
          )}
        </span>
      ),
    },
    { key: "priority", header: "Priority", cell: (r) => priorityBadge(r.priority) },
    {
      key: "due",
      header: "Due",
      cell: (r) => {
        const overdue = new Date(r.dueAt).getTime() < Date.now() && r.status === "PENDING";
        return (
          <span className={`text-[12px] ${overdue ? "text-rose-500 font-semibold" : ""}`}>
            {formatDateTime(r.dueAt)}
            {overdue && <span className="ml-1 text-[10px] uppercase">overdue</span>}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => void callNow(r)}
            disabled={!r.lead}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-1 text-[11px] hover:bg-[var(--sibling-primary)]/10 disabled:opacity-40"
          >
            <PhoneCall className="w-3 h-3" /> Call
          </button>
          <button
            type="button"
            onClick={() => void patch(r.id, { status: "DONE" })}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/25"
          >
            <Check className="w-3 h-3" /> Done
          </button>
          <button
            type="button"
            onClick={() => {
              const snoozedTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              void patch(r.id, { status: "SNOOZED", dueAt: snoozedTo });
            }}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-500 hover:bg-amber-500/25"
          >
            <Pause className="w-3 h-3" /> Snooze
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Follow-ups"
        description="Scheduled re-engagement tasks. AI auto-creates follow-ups when calls end with 'call back later'."
      />

      <KpiRow
        items={[
          { label: "Pending", value: kpis.pending.toLocaleString(), icon: BellRing },
          {
            label: "Overdue",
            value: kpis.overdue.toLocaleString(),
            icon: AlarmClock,
          },
          { label: "Due Today", value: kpis.today.toLocaleString(), icon: Clock },
          {
            label: "Completed Today",
            value: kpis.completedToday.toLocaleString(),
            icon: CheckCircle2,
          },
          { label: "Shown", value: filtered.length.toLocaleString() },
          { label: "Loaded", value: items.length.toLocaleString() },
        ]}
      />

      <FilterChips chips={DUE_CHIPS} activeId={dueFilter} onChange={setDueFilter} />

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        empty={
          <div className="text-sm text-muted-foreground">
            Nothing to follow up on. Great work.
          </div>
        }
      />
    </div>
  );
}

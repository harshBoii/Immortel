"use client";

import { useMemo, useState } from "react";
import {
  MessagesSquare,
  Smile,
  Frown,
  Meh,
  Search,
  Volume2,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";
import type { Channel, Sentiment } from "@prisma/client";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { KpiRow } from "@/app/components/calls/common/KpiRow";
import {
  CallsTable,
  type CallsTableColumn,
} from "@/app/components/calls/common/CallsTable";
import { FilterChips } from "@/app/components/calls/common/FilterChips";
import { DetailDrawer } from "@/app/components/calls/common/DetailDrawer";
import { formatRelative } from "@/app/components/calls/common/format";

export type ConversationRow = {
  id: string;
  channel: Channel;
  summary: string | null;
  sentiment: Sentiment | null;
  keywords: string[];
  lastMessageAt: string | null;
  createdAt: string;
  lead: { id: string; name: string; phone: string } | null;
};

type Kpis = {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
};

const CHANNEL_CHIPS = [
  { id: "all", label: "All" },
  { id: "VOICE", label: "Voice" },
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "SMS", label: "SMS" },
  { id: "EMAIL", label: "Email" },
];

const CHANNEL_ICONS: Record<Channel, React.ComponentType<{ className?: string }>> = {
  VOICE: Volume2,
  WHATSAPP: MessageSquare,
  SMS: Phone,
  EMAIL: Mail,
};

function sentimentBadge(s: Sentiment | null) {
  if (!s) return <span className="text-muted-foreground/60">—</span>;
  const map: Record<Sentiment, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    POSITIVE: { cls: "text-emerald-500", icon: Smile },
    NEGATIVE: { cls: "text-rose-500", icon: Frown },
    NEUTRAL: { cls: "text-slate-400", icon: Meh },
  };
  const { cls, icon: Icon } = map[s];
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {s.toLowerCase()}
    </span>
  );
}

export default function ConversationsDashboard({
  kpis,
  initial,
}: {
  kpis: Kpis;
  initial: ConversationRow[];
}) {
  const [items, setItems] = useState<ConversationRow[]>(initial);
  const [channel, setChannel] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ConversationRow | null>(null);
  const [detail, setDetail] = useState<{
    messages?: { id: string; text: string | null; direction: string; createdAt: string }[];
    lead?: { name: string } | null;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (channel !== "all" && i.channel !== channel) return false;
      if (!q) return true;
      return (
        (i.summary ?? "").toLowerCase().includes(q) ||
        (i.lead?.name ?? "").toLowerCase().includes(q) ||
        (i.lead?.phone ?? "").toLowerCase().includes(q) ||
        i.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [items, channel, search]);

  async function openConvo(row: ConversationRow) {
    setActive(row);
    setDetail(null);
    const r = await fetch(`/api/calls/conversations/${row.id}`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setDetail(j.conversation);
    }
  }

  const columns: CallsTableColumn<ConversationRow>[] = [
    {
      key: "lead",
      header: "Lead",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.lead?.name ?? "—"}</span>
          <span className="text-[11px] text-muted-foreground/70">{r.lead?.phone ?? ""}</span>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (r) => {
        const Icon = CHANNEL_ICONS[r.channel];
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px]">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {r.channel}
          </span>
        );
      },
    },
    {
      key: "summary",
      header: "Summary",
      cell: (r) => (
        <span className="block max-w-[420px] truncate text-[12px] text-muted-foreground/90">
          {r.summary ?? "—"}
        </span>
      ),
    },
    { key: "sentiment", header: "Sentiment", cell: (r) => sentimentBadge(r.sentiment) },
    {
      key: "when",
      header: "Last Activity",
      cell: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {formatRelative(r.lastMessageAt ?? r.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Conversations"
        description="Unified view across call summaries and messaging. Search semantically or filter by channel."
      />

      <KpiRow
        items={[
          { label: "Total", value: kpis.total.toLocaleString(), icon: MessagesSquare },
          { label: "Positive", value: kpis.positive.toLocaleString(), icon: Smile },
          { label: "Neutral", value: kpis.neutral.toLocaleString(), icon: Meh },
          { label: "Negative", value: kpis.negative.toLocaleString(), icon: Frown },
          { label: "Shown", value: filtered.length.toLocaleString() },
          { label: "Loaded", value: items.length.toLocaleString() },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips chips={CHANNEL_CHIPS} activeId={channel} onChange={setChannel} />
        <label className="relative inline-flex max-w-xs flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search summary, name, phone, keywords…"
            className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 py-2 pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
          />
        </label>
      </div>

      <CallsTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        onRowClick={openConvo}
        empty={
          <div className="text-sm text-muted-foreground">
            No conversations yet. They're created automatically after completed calls.
          </div>
        }
      />

      <DetailDrawer
        open={!!active}
        title={active?.lead?.name ?? "Conversation"}
        subtitle={active?.channel}
        onClose={() => setActive(null)}
        widthClass="w-full sm:w-[540px]"
      >
        {!active ? null : (
          <div className="flex flex-col gap-3 text-[13px]">
            {active.summary && (
              <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/50 px-3 py-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Summary
                </h4>
                <p className="mt-1 text-foreground">{active.summary}</p>
              </div>
            )}
            {active.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {active.keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-0.5 text-[10.5px]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Messages
              </h4>
              {(detail?.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-[12.5px] ${
                    m.direction === "OUT"
                      ? "bg-[var(--sibling-primary)]/10 border border-[var(--sibling-primary)]/30"
                      : "bg-[var(--glass-hover)] border border-[var(--glass-border)]"
                  }`}
                >
                  <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground/60">
                    {m.direction === "OUT" ? "Sent" : "Received"} · {formatRelative(m.createdAt)}
                  </div>
                  <div className="mt-1 text-foreground">{m.text ?? "—"}</div>
                </div>
              ))}
              {!detail && (
                <div className="text-[12px] text-muted-foreground">Loading messages…</div>
              )}
              {detail?.messages && detail.messages.length === 0 && (
                <div className="text-[12px] text-muted-foreground">No messages recorded.</div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
